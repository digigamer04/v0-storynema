/**
 * Utilidades para extraer y procesar datos de forma de onda de archivos de audio
 */

/**
 * Extrae datos de forma de onda de un archivo de audio
 * @param audioUrl URL del archivo de audio
 * @param numSamples Número de muestras a extraer
 * @returns Promise con un array de valores normalizados (0-1)
 */
export async function extractWaveformData(audioUrl: string, numSamples = 100): Promise<number[]> {
  return new Promise((resolve, reject) => {
    try {
      // Crear un contexto de audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Cargar el archivo de audio
      fetch(audioUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error al cargar el audio: ${response.status} ${response.statusText}`)
          }
          return response.arrayBuffer()
        })
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
        .then((audioBuffer) => {
          // Obtener los datos del canal izquierdo (o mono)
          const channelData = audioBuffer.getChannelData(0)
          const blockSize = Math.floor(channelData.length / numSamples)
          const waveformData = []

          // Calcular el valor RMS (Root Mean Square) para cada bloque
          for (let i = 0; i < numSamples; i++) {
            const start = blockSize * i
            let sum = 0

            // Calcular la suma de los cuadrados
            for (let j = 0; j < blockSize; j++) {
              if (start + j < channelData.length) {
                sum += channelData[start + j] ** 2
              }
            }

            // Calcular la raíz cuadrada del promedio (RMS)
            const rms = Math.sqrt(sum / blockSize)

            // Normalizar a un valor entre 0 y 1, con un mínimo para visualización
            waveformData.push(Math.max(0.1, Math.min(1, rms * 3)))
          }

          resolve(waveformData)
        })
        .catch((error) => {
          console.error("Error al procesar el audio:", error)
          // En caso de error, devolver datos simulados
          resolve(generateSimulatedWaveformData(numSamples))
        })
    } catch (error) {
      console.error("Error al crear el contexto de audio:", error)
      // En caso de error, devolver datos simulados
      resolve(generateSimulatedWaveformData(numSamples))
    }
  })
}

/**
 * Genera datos de forma de onda simulados
 * @param numSamples Número de muestras a generar
 * @returns Array de valores normalizados (0-1)
 */
export function generateSimulatedWaveformData(numSamples = 100): number[] {
  const waveformData = []

  // Generar valores aleatorios con cierta coherencia
  let value = 0.5
  for (let i = 0; i < numSamples; i++) {
    // Añadir un valor aleatorio entre -0.15 y 0.15 al valor anterior
    value += (Math.random() - 0.5) * 0.3
    // Mantener el valor entre 0.1 y 0.9
    value = Math.max(0.1, Math.min(0.9, value))
    waveformData.push(value)
  }

  return waveformData
}

/**
 * Dibuja la forma de onda en un canvas
 * @param canvas Elemento canvas
 * @param waveformData Datos de forma de onda
 * @param color Color de la forma de onda (CSS)
 */
export function drawWaveform(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  color = "rgba(245, 158, 11, 0.7)",
): void {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  // Configurar el canvas
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.offsetWidth * dpr
  canvas.height = canvas.offsetHeight * dpr
  ctx.scale(dpr, dpr)

  // Limpiar el canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Dibujar la forma de onda
  const width = canvas.offsetWidth
  const height = canvas.offsetHeight
  const barWidth = width / waveformData.length
  const barGap = Math.max(0, barWidth - 1)

  ctx.fillStyle = color

  waveformData.forEach((value, index) => {
    const barHeight = value * height * 0.8 // Escalar para que no ocupe todo el alto
    const x = index * barWidth
    const y = (height - barHeight) / 2

    ctx.fillRect(x, y, barGap, barHeight)
  })
}

/**
 * Extrae datos de forma de onda de manera eficiente para archivos grandes
 * @param audioUrl URL del archivo de audio
 * @param numSamples Número de muestras a extraer
 * @param onProgress Callback para reportar progreso (0-1)
 * @returns Promise con un array de valores normalizados (0-1)
 */
export async function extractWaveformDataEfficient(
  audioUrl: string,
  numSamples = 100,
  onProgress?: (progress: number) => void,
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    try {
      // Crear un elemento de audio para obtener la duración
      const audio = new Audio()
      audio.crossOrigin = "anonymous"

      audio.onloadedmetadata = () => {
        const audioDuration = audio.duration

        // Crear un contexto de audio para el análisis
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048

        const source = audioContext.createMediaElementSource(audio)
        source.connect(analyser)
        analyser.connect(audioContext.destination)

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const waveformData: number[] = Array(numSamples).fill(0)
        let sampleCount = 0
        let currentSampleIndex = 0

        // Función para procesar los datos de audio
        const processAudio = () => {
          if (audio.paused || audio.ended) return

          analyser.getByteTimeDomainData(dataArray)

          // Calcular RMS del buffer actual
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            // Convertir de 0-255 a -1 a 1
            const amplitude = dataArray[i] / 128 - 1
            sum += amplitude * amplitude
          }
          const rms = Math.sqrt(sum / bufferLength)

          // Calcular el índice de muestra actual basado en el tiempo de reproducción
          const newSampleIndex = Math.floor((audio.currentTime / audioDuration) * numSamples)

          if (newSampleIndex !== currentSampleIndex && newSampleIndex < numSamples) {
            currentSampleIndex = newSampleIndex
            waveformData[currentSampleIndex] = Math.max(0.1, Math.min(1, rms * 3))
            sampleCount++

            // Reportar progreso
            if (onProgress) {
              onProgress(sampleCount / numSamples)
            }
          }

          // Continuar procesando si no hemos terminado
          if (sampleCount < numSamples && !audio.ended) {
            requestAnimationFrame(processAudio)
          } else {
            // Detener la reproducción y resolver
            audio.pause()
            audio.currentTime = 0
            resolve(waveformData)
          }
        }

        // Iniciar la reproducción y el procesamiento
        audio
          .play()
          .then(() => {
            // Establecer la velocidad de reproducción más alta para procesar más rápido
            audio.playbackRate = 4.0
            processAudio()
          })
          .catch((error) => {
            console.error("Error al reproducir audio para análisis:", error)
            resolve(generateSimulatedWaveformData(numSamples))
          })
      }

      audio.onerror = () => {
        console.error("Error al cargar el audio para análisis")
        resolve(generateSimulatedWaveformData(numSamples))
      }

      audio.src = audioUrl
    } catch (error) {
      console.error("Error al analizar forma de onda:", error)
      resolve(generateSimulatedWaveformData(numSamples))
    }
  })
}
