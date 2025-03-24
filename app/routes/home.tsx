import type { Route } from "./+types/home"
import { useState, useRef, useEffect, type MouseEvent } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Button } from "~/components/ui/button"

export function meta({}: Route.MetaArgs) {
  return [{ title: "Marcar idiomas" }, { name: "description", content: "Welcome to React Router!" }]
}

// Definir los idiomas disponibles
const idiomas = ["generico", "español", "inglés", "francés", "alemán", "italiano", "portugués"] as const
type Idiomas = (typeof idiomas)[number]

// Define el tipo de segmento de texto
interface TextoServidor {
  idioma: Idiomas
  texto: string
}

export async function loader() {
  // Datos iniciales cargados desde el servidor
  const textoServidor: TextoServidor[] = [
    { idioma: "generico", texto: "Haz clic en cualquier parte de este texto y selecciona un idioma para etiquetarlo." },
  ]
  return textoServidor
}

export default function TextEditor({ loaderData }: Route.ComponentProps) {
  // Estado para almacenar las porciones de texto con sus etiquetas de idioma
  const [porcionesDeTexto, setPorcionesDeTexto] = useState<TextoServidor[]>(loaderData)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [inicioSeleccion, setInicioSeleccion] = useState<number>(0)
  const [finSeleccion, setFinSeleccion] = useState<number>(0)
  const [estaSeleccionando, setEstaSeleccionando] = useState<boolean>(false)
  const [infoDepuracion, setInfoDepuracion] = useState<string>("")

  // Función para obtener el texto completo a partir de los segmentos
  const obtenerTextoCompleto = (): string => {
    return porcionesDeTexto.map((segmento) => segmento.texto).join("")
  }

  // Maneja el evento de presionar el ratón para iniciar la selección
  const manejarRatonAbajo = (e: MouseEvent<HTMLDivElement>): void => {
    if (editorRef.current) {
      setEstaSeleccionando(true)
      setInfoDepuracion("Iniciando selección...")
    }
  }

  // Maneja el evento de soltar el ratón para finalizar la selección
  const manejarRatonArriba = (e: MouseEvent<HTMLDivElement>): void => {
    if (estaSeleccionando && editorRef.current) {
      const seleccion = window.getSelection()
      if (!seleccion) return

      const textoSeleccionado = seleccion.toString()

      if (textoSeleccionado.length > 0) {
        // Obtener las posiciones relativas al contenido del editor
        const textoCompleto = obtenerTextoCompleto()

        // Encontrar el texto seleccionado en el contenido completo
        const inicio = textoCompleto.indexOf(textoSeleccionado)
        const fin = inicio + textoSeleccionado.length

        if (inicio !== -1) {
          setInicioSeleccion(inicio)
          setFinSeleccion(fin)
          setInfoDepuracion(`Selección: "${textoSeleccionado}" (${inicio}-${fin})`)
        } else {
          setInfoDepuracion("No se pudo encontrar la selección en el texto")
        }
      } else {
        setInfoDepuracion("No hay texto seleccionado")
      }

      setEstaSeleccionando(false)
    }
  }

  // Aplica un idioma al texto seleccionado
  const aplicarIdioma = (idioma: Idiomas): void => {
    if (inicioSeleccion >= 0 && finSeleccion > inicioSeleccion) {
      // Crear un mapa de posiciones de caracteres a índices de segmento
      const mapaPosicciones: number[] = []
      let posicionActual = 0

      porcionesDeTexto.forEach((segmento, indice) => {
        for (let i = 0; i < segmento.texto.length; i++) {
          mapaPosicciones[posicionActual + i] = indice
        }
        posicionActual += segmento.texto.length
      })

      // Encontrar segmentos afectados
      const indicesSegmentosAfectados = new Set<number>()
      for (let i = inicioSeleccion; i < finSeleccion; i++) {
        indicesSegmentosAfectados.add(mapaPosicciones[i])
      }

      // Crear nuevo array de segmentos
      const nuevosSegmentos: TextoServidor[] = []
      let posActual = 0

      for (let i = 0; i < porcionesDeTexto.length; i++) {
        const segmento = porcionesDeTexto[i]
        const inicioSegmento = posActual
        const finSegmento = inicioSegmento + segmento.texto.length

        // Comprobar si este segmento está afectado por la selección
        if (indicesSegmentosAfectados.has(i)) {
          // Calcular superposición con la selección
          const inicioSuperposicion = Math.max(inicioSegmento, inicioSeleccion)
          const finSuperposicion = Math.min(finSegmento, finSeleccion)

          // Añadir parte antes de la selección si existe
          if (inicioSuperposicion > inicioSegmento) {
            nuevosSegmentos.push({
              idioma: segmento.idioma,
              texto: segmento.texto.substring(0, inicioSuperposicion - inicioSegmento),
            })
          }

          // Añadir la parte seleccionada con el nuevo idioma
          nuevosSegmentos.push({
            idioma: idioma,
            texto: segmento.texto.substring(inicioSuperposicion - inicioSegmento, finSuperposicion - inicioSegmento),
          })

          // Añadir parte después de la selección si existe
          if (finSuperposicion < finSegmento) {
            nuevosSegmentos.push({
              idioma: segmento.idioma,
              texto: segmento.texto.substring(finSuperposicion - inicioSegmento),
            })
          }
        } else {
          // Segmento no afectado, mantenerlo como está
          nuevosSegmentos.push(segmento)
        }

        posActual = finSegmento
      }

      // Fusionar segmentos adyacentes con el mismo idioma
      const segmentosFusionados: TextoServidor[] = []
      let segmentoActual: TextoServidor | null = null

      nuevosSegmentos.forEach((segmento) => {
        if (!segmentoActual) {
          segmentoActual = { ...segmento }
        } else if (segmentoActual.idioma === segmento.idioma) {
          segmentoActual.texto += segmento.texto
        } else {
          segmentosFusionados.push(segmentoActual)
          segmentoActual = { ...segmento }
        }
      })

      if (segmentoActual) {
        segmentosFusionados.push(segmentoActual)
      }

      setPorcionesDeTexto(segmentosFusionados)
      setInfoDepuracion(`Idioma "${idioma}" aplicado a la selección (${inicioSeleccion}-${finSeleccion})`)

      // Reiniciar selección
      setInicioSeleccion(0)
      setFinSeleccion(0)
    }
  }

  // Renderizar el contenido del editor
  useEffect(() => {
    if (editorRef.current) {
      // Limpiar el contenido actual
      editorRef.current.innerHTML = ""

      // Renderizar cada segmento con su etiqueta de idioma
      porcionesDeTexto.forEach((segmento, indice) => {
        const span = document.createElement("span")
        span.textContent = segmento.texto
        span.dataset.language = segmento.idioma

        // Aplicar estilo a los segmentos con idioma específico
        if (segmento.idioma !== "generico") {
          span.classList.add("underline", "decoration-2", "decoration-blue-500")

          // Añadir etiqueta de idioma como superíndice
          const sup = document.createElement("sup")
          sup.textContent = `[${segmento.idioma}]`
          sup.classList.add("ml-1", "text-xs", "text-blue-600", "font-bold")
          span.appendChild(sup)
        }

        editorRef.current?.appendChild(span)
      })
    }
  }, [porcionesDeTexto])

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Editor de Texto con Etiquetado de Idiomas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">
            Selecciona texto y luego haz clic en uno de los botones de idioma para etiquetarlo. Puedes seleccionar
            múltiples partes del texto y asignarles diferentes idiomas.
          </div>

          <div
            ref={editorRef}
            className="border rounded-md p-4 min-h-[200px] mb-4"
            onMouseDown={manejarRatonAbajo}
            onMouseUp={manejarRatonArriba}
          />

          <div className="flex flex-wrap gap-2 mb-4">
            {idiomas.map((idioma) => (
              <Button
                key={idioma}
                variant={idioma === "generico" ? "outline" : "default"}
                onClick={() => aplicarIdioma(idioma)}
                className={inicioSeleccion === finSeleccion ? "opacity-50 cursor-not-allowed" : ""}
                disabled={inicioSeleccion === finSeleccion}
              >
                {idioma}
              </Button>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">{infoDepuracion}</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="preview">
        <TabsList className="mb-4">
          <TabsTrigger value="preview">Vista Previa</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa</CardTitle>
            </CardHeader>
            <CardContent>
              {porcionesDeTexto.map((segmento, indice) => (
                <span
                  key={indice}
                  className={`${segmento.idioma !== "generico" ? "underline decoration-2 decoration-blue-500" : ""}`}
                >
                  {segmento.texto}
                  {segmento.idioma !== "generico" && (
                    <sup className="ml-1 text-xs text-blue-600 font-bold">[{segmento.idioma}]</sup>
                  )}
                </span>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle>Estructura JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
                {JSON.stringify(porcionesDeTexto, null, 2)}
              </pre>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigator.clipboard.writeText(JSON.stringify(porcionesDeTexto))} variant="outline">
                Copiar JSON
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}