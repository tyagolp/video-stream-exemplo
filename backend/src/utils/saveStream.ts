import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

// Defina o diretório onde os arquivos HLS serão armazenados
export const hlsDirectory = path.join(__dirname, "..", "hls");
if (!fs.existsSync(hlsDirectory)) {
  fs.mkdirSync(hlsDirectory);
}

// Função para iniciar a conversão de RTSP para HLS
export const saveStartStreaming = () => {
  // URL do stream RTSP da câmera IP
  const rtspUrl = "rtsp://admin:Tera102030@192.168.100.154:554/ao_vivo/0/MAIN";
  // const rtspUrl = "rtsp://admin:Tera102030@192.168.100.154:554/ao_vivo/0/SUB";
  const outputPath = path.join(hlsDirectory, "playlist.m3u8");

  ffmpeg(rtspUrl)
    .addOptions([
      "-f hls", // -f hls: Define o formato de saída como HLS
      "-hls_time 2", // -hls_time 2: Define o tempo de cada segmento de vídeo em 2 segundos.
      "-hls_list_size 3", // -hls_list_size 3: Mantém apenas os 3 segmentos mais recentes no diretório.
      "-hls_flags delete_segments", // -hls_flags delete_segments: Remove segmentos antigos para otimizar o armazenamento.
      // "-hls_playlist_type event", // Gera a playlist em tempo real
      // "-flush_packets 1", // Grava os dados em tempo real no arquivo de saída
    ])
    .output(outputPath)
    .on("end", () => console.log("Streaming finalizado."))
    .on("error", (err) => console.error("Erro no streaming:", err))
    .run();
};
