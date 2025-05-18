import type { Scene } from "@/types/scene"
import type { StoryboardScene } from "@/types/storyboard"

// Clase para manejar la sincronización entre el editor de guiones y el storyboard
class SyncService {
  private static instance: SyncService
  private lastUpdateSource: string | null = null
  private lastUpdateTimestamp = 0
  private updateThreshold = 500 // ms

  private constructor() {}

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  // Convierte escenas del guion a escenas del storyboard
  public convertScriptScenesToStoryboard(scenes: Scene[]): StoryboardScene[] {
    try {
      if (!scenes || scenes.length === 0) {
        console.log("No hay escenas para convertir a storyboard")
        return []
      }

      return scenes.map((scene) => ({
        id: scene.id,
        title: scene.title || "Sin título",
        description: scene.content || "",
        images: scene.images || [],
        notes: scene.notes || "",
        characters: scene.characters || [],
        locations: scene.locations || [],
        props: scene.props || [],
        status: scene.status || "pending",
        order: scene.order || 0,
      }))
    } catch (error) {
      console.error("Error al convertir escenas del guion a storyboard:", error)
      return []
    }
  }

  // Convierte escenas del storyboard a escenas del guion
  public convertStoryboardScenesToScript(scenes: StoryboardScene[]): Scene[] {
    try {
      if (!scenes || scenes.length === 0) {
        console.log("No hay escenas de storyboard para convertir a guion")
        return []
      }

      return scenes.map((scene) => ({
        id: scene.id,
        title: scene.title || "Sin título",
        content: scene.description || "",
        images: scene.images || [],
        notes: scene.notes || "",
        characters: scene.characters || [],
        locations: scene.locations || [],
        props: scene.props || [],
        status: scene.status || "pending",
        order: scene.order || 0,
        versions: [],
        currentVersion: 0,
      }))
    } catch (error) {
      console.error("Error al convertir escenas de storyboard a guion:", error)
      return []
    }
  }

  // Actualiza las escenas del storyboard basadas en las escenas del guion
  public updateStoryboardFromScript(
    storyboardScenes: StoryboardScene[],
    scriptScenes: Scene[],
    source: string,
  ): StoryboardScene[] {
    try {
      const now = Date.now()

      // Evitar ciclos de actualización
      if (
        this.lastUpdateSource === "storyboard" &&
        source === "script" &&
        now - this.lastUpdateTimestamp < this.updateThreshold
      ) {
        console.log("Evitando ciclo de actualización (storyboard -> script)")
        return storyboardScenes
      }

      this.lastUpdateSource = source
      this.lastUpdateTimestamp = now

      if (!scriptScenes || scriptScenes.length === 0) {
        console.log("No hay escenas de guion para actualizar el storyboard")
        return storyboardScenes
      }

      // Si no hay escenas en el storyboard, convertir todas las del guion
      if (!storyboardScenes || storyboardScenes.length === 0) {
        return this.convertScriptScenesToStoryboard(scriptScenes)
      }

      // Crear un mapa de las escenas existentes en el storyboard por ID
      const storyboardMap = new Map<string, StoryboardScene>()
      storyboardScenes.forEach((scene) => storyboardMap.set(scene.id, scene))

      // Actualizar escenas existentes y agregar nuevas
      const updatedScenes = scriptScenes.map((scriptScene) => {
        const existingScene = storyboardMap.get(scriptScene.id)

        if (existingScene) {
          // Actualizar solo los campos necesarios para mantener otros datos del storyboard
          return {
            ...existingScene,
            title: scriptScene.title || existingScene.title,
            description: scriptScene.content || existingScene.description,
            // Mantener las imágenes y otros datos específicos del storyboard
          }
        } else {
          // Crear una nueva escena de storyboard
          return this.convertScriptScenesToStoryboard([scriptScene])[0]
        }
      })

      // Preservar el orden original
      updatedScenes.sort((a, b) => (a.order || 0) - (b.order || 0))

      return updatedScenes
    } catch (error) {
      console.error("Error al actualizar el storyboard desde el guion:", error)
      return storyboardScenes
    }
  }

  // Actualiza las escenas del guion basadas en las escenas del storyboard
  public updateScriptFromStoryboard(
    scriptScenes: Scene[],
    storyboardScenes: StoryboardScene[],
    source: string,
  ): Scene[] {
    try {
      const now = Date.now()

      // Evitar ciclos de actualización
      if (
        this.lastUpdateSource === "script" &&
        source === "storyboard" &&
        now - this.lastUpdateTimestamp < this.updateThreshold
      ) {
        console.log("Evitando ciclo de actualización (script -> storyboard)")
        return scriptScenes
      }

      this.lastUpdateSource = source
      this.lastUpdateTimestamp = now

      if (!storyboardScenes || storyboardScenes.length === 0) {
        console.log("No hay escenas de storyboard para actualizar el guion")
        return scriptScenes
      }

      // Si no hay escenas en el guion, convertir todas las del storyboard
      if (!scriptScenes || scriptScenes.length === 0) {
        return this.convertStoryboardScenesToScript(storyboardScenes)
      }

      // Crear un mapa de las escenas existentes en el guion por ID
      const scriptMap = new Map<string, Scene>()
      scriptScenes.forEach((scene) => scriptMap.set(scene.id, scene))

      // Actualizar escenas existentes y agregar nuevas
      const updatedScenes = storyboardScenes.map((storyboardScene) => {
        const existingScene = scriptMap.get(storyboardScene.id)

        if (existingScene) {
          // Actualizar solo los campos necesarios para mantener versiones y otros datos del guion
          return {
            ...existingScene,
            title: storyboardScene.title || existingScene.title,
            content: storyboardScene.description || existingScene.content,
            // Mantener las versiones y otros datos específicos del guion
          }
        } else {
          // Crear una nueva escena de guion
          return this.convertStoryboardScenesToScript([storyboardScene])[0]
        }
      })

      // Preservar el orden original
      updatedScenes.sort((a, b) => (a.order || 0) - (b.order || 0))

      return updatedScenes
    } catch (error) {
      console.error("Error al actualizar el guion desde el storyboard:", error)
      return scriptScenes
    }
  }

  // Método para sincronizar una escena específica del storyboard con el guion
  public syncSpecificScene(scriptScenes: Scene[], storyboardScene: StoryboardScene, source: string): Scene[] {
    try {
      const now = Date.now()

      // Evitar ciclos de actualización
      if (
        this.lastUpdateSource === "script" &&
        source === "storyboard" &&
        now - this.lastUpdateTimestamp < this.updateThreshold
      ) {
        console.log("Evitando ciclo de actualización en escena específica")
        return scriptScenes
      }

      this.lastUpdateSource = source
      this.lastUpdateTimestamp = now

      // Crear una copia de las escenas del guion
      const updatedScenes = [...scriptScenes]

      // Buscar la escena correspondiente en el guion
      const scriptSceneIndex = updatedScenes.findIndex((s) => s.id === storyboardScene.id)

      if (scriptSceneIndex >= 0) {
        // Actualizar la escena existente
        updatedScenes[scriptSceneIndex] = {
          ...updatedScenes[scriptSceneIndex],
          title: storyboardScene.title || updatedScenes[scriptSceneIndex].title,
          content: storyboardScene.description || updatedScenes[scriptSceneIndex].content,
        }
      } else {
        // Agregar una nueva escena al guion
        const newScriptScene = this.convertStoryboardScenesToScript([storyboardScene])[0]
        updatedScenes.push(newScriptScene)
        // Ordenar las escenas
        updatedScenes.sort((a, b) => (a.order || 0) - (b.order || 0))
      }

      return updatedScenes
    } catch (error) {
      console.error("Error al sincronizar escena específica:", error)
      return scriptScenes
    }
  }
}

export default SyncService
