import { FastifyInstance } from "fastify";
import { PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";

export async function Websocket(app: FastifyInstance) {
  app.get("/stream_rtsp", { websocket: true }, (socket, req) => {
    console.log("stream_rtsp -> conectado ao WebSocket.");

    const rtspUrl =
      "rtsp://admin:Tera102030@192.168.100.154:554/ao_vivo/0/MAIN";
    const passThroughStream = new PassThrough();
    let ffmpegSubProcess: any;

    // Configura o FFmpeg para converter o RTSP em MJPEG e enviar via WebSocket
    const ffmpegProcess = ffmpeg(rtspUrl)
      .addOptions([
        "-f mjpeg", // Formato de saída como MJPEG
        "-r 20", // Define a taxa de frames (20 FPS)
        "-s 1080x720", // Reduz a resolução para 640x360
      ])
      .on("error", (err) => {
        console.error("Erro no FFmpeg:", err);
        socket.close();
      })
      .on("end", () => {
        console.log("Streaming finalizado.");
        socket.close();
      })
      .pipe(passThroughStream);

    // Captura o processo subjacente do FFmpeg
    ffmpegProcess.on("start", (command) => {
      ffmpegSubProcess = ffmpegProcess;
    });

    let frameBuffer = Buffer.alloc(0);

    const sendInterval = 1000 / 20; // 5 frames por segundo
    let lastSendTime = Date.now();

    // Envia cada frame recebido para o cliente via WebSocket
    passThroughStream.on("data", (chunk) => {
      frameBuffer = Buffer.concat([frameBuffer, chunk]);

      // Verifique se o buffer contém um frame JPEG completo
      const startMarker = frameBuffer.indexOf(Buffer.from([0xff, 0xd8])); // Início de um JPEG
      const endMarker = frameBuffer.indexOf(Buffer.from([0xff, 0xd9])); // Fim de um JPEG
      if (startMarker !== -1 && endMarker !== -1 && startMarker < endMarker) {
        const completeFrame = frameBuffer.slice(startMarker, endMarker + 2);
        frameBuffer = frameBuffer.slice(endMarker + 2); // Remove o frame completo do buffer

        // Controla a taxa de envio
        const now = Date.now();
        if (now - lastSendTime >= sendInterval) {
          if (socket.readyState === socket.OPEN) {
            socket.send(completeFrame); // Envia o frame completo
            lastSendTime = now;
            console.log("send image", now);
          }
        }
      }

      //   console.log("data ->", chunk);
      //   console.log(socket.readyState, socket.OPEN);
      //   if (socket.readyState === socket.OPEN) {
      //     socket.send(data); // Envia o frame atual como um buffer
      //   }
    });

    // Finalizar o stream se o cliente se desconectar
    socket.on("close", () => {
      console.log("Cliente desconectado do WebSocket.");
      if (ffmpegSubProcess) {
        ffmpegSubProcess.kill("SIGKILL"); // Para o processo do FFmpeg
      }
    });
  });

  app.get("/stream_sse", { websocket: true }, async (socket) => {
    console.log("stream_sse -> conectado ao WebSocket.");

    const sseUrl = "http://192.168.100.154/Streams/1/1/ReceiveData";
    const username = "admin";
    const password = "Tera102030";
    const authHeader =
      "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

    const response = await axios.get(sseUrl, {
      headers: {
        Authorization: authHeader,
        Accept: "text/event-stream",
      },
      responseType: "stream",
    });

    console.log(`response data`);

    // Manipula o fluxo de dados recebido da conexão SSE
    // response.data.on("data", (chunk: Buffer) => {
    //   // const data = chunk.toString();
    //   console.log(`response data`, chunk);
    //   if (socket.readyState === socket.OPEN) {
    //     socket.send(chunk);
    //   }

    //   // Extrai o conteúdo das mensagens SSE
    //   // const match = data.match(/^data:\s*(.*)$/m);
    //   // if (match) {
    //   //   const imageData = match[1];

    //   //   if (socket.readyState === socket.OPEN) {
    //   //     socket.send(chunk);
    //   //   }
    //   // }
    // });

    // let frameBuffer = Buffer.alloc(0);
    // const sendInterval = 1000 / 10; // Controla para 20 frames por segundo
    // let lastSendTime = Date.now();

    response.data.on("data", (chunk: Buffer) => {
      console.log(chunk);

      if (socket.readyState === socket.OPEN) {
        socket.send(chunk);
      }
      // frameBuffer = Buffer.concat([frameBuffer, chunk]);

      // // Detecta o início e o fim de um frame JPEG
      // const startMarker = frameBuffer.indexOf(Buffer.from([0xff, 0xd8]));
      // const endMarker = frameBuffer.indexOf(Buffer.from([0xff, 0xd9]));

      // if (startMarker !== -1 && endMarker !== -1 && startMarker < endMarker) {
      //   const completeFrame = frameBuffer.slice(startMarker, endMarker + 2);
      //   frameBuffer = frameBuffer.slice(endMarker + 2);

      //   // Controla a taxa de envio dos frames
      //   const now = Date.now();
      //   if (now - lastSendTime >= sendInterval) {
      //     if (socket.readyState === socket.OPEN) {
      //       socket.send(completeFrame); // Envia o frame completo para o cliente
      //       lastSendTime = now;
      //       console.log("Enviando frame de imagem via SSE", now);
      //     }
      //   }
      // }
    });

    response.data.on("end", () => {
      console.log("Conexão SSE finalizada. Tentando reconectar...");
      // setTimeout(connectSSE, 3000); // Tenta reconectar após 3 segundos
    });

    socket.on("close", () => {
      console.log("Cliente desconectado do WebSocket.");
    });
  });
}
