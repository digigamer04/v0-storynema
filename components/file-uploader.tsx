"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface FileUploaderProps {
  bucket: string
  path: string
  accept?: string
  maxSize?: number // en MB
  onUploadComplete: (url: string, file: File) => void
}

export default function FileUploader({
  bucket,
  path,
  accept,
  maxSize = 10, // 10MB por defecto
  onUploadComplete,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "Error",
        description: `El archivo es demasiado grande. El tamaño máximo es ${maxSize}MB.`,
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const supabase = createClientSupabaseClient()

      // Generar un nombre único para el archivo
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${path}/${fileName}`

      // Subir el archivo
      const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (error) {
        throw error
      }

      // Obtener la URL pública
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

      // Llamar al callback con la URL
      onUploadComplete(data.publicUrl, file)

      toast({
        title: "Archivo subido",
        description: "El archivo se ha subido correctamente.",
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Error",
        description: "Error al subir el archivo. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <Button
        variant="outline"
        onClick={() => document.getElementById("file-upload")?.click()}
        disabled={isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Subir archivo
          </>
        )}
      </Button>
    </div>
  )
}
