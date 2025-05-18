import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Ejecutar las políticas SQL
    const policiesSQL = `
   -- Políticas para la tabla scenes
   DROP POLICY IF EXISTS "Usuarios pueden ver escenas de sus proyectos" ON public.scenes;
   DROP POLICY IF EXISTS "Usuarios pueden crear escenas en sus proyectos" ON public.scenes;
   DROP POLICY IF EXISTS "Usuarios pueden actualizar escenas de sus proyectos" ON public.scenes;
   DROP POLICY IF EXISTS "Usuarios pueden eliminar escenas de sus proyectos" ON public.scenes;

   CREATE POLICY "Usuarios pueden ver escenas de sus proyectos"
   ON public.scenes FOR SELECT
   USING (
     EXISTS (
       SELECT 1 FROM public.projects 
       WHERE projects.id = scenes.project_id 
       AND (
         projects.user_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM public.project_collaborators 
           WHERE project_collaborators.project_id = projects.id 
           AND project_collaborators.user_id = auth.uid()
         )
       )
     )
   );

   CREATE POLICY "Usuarios pueden crear escenas en sus proyectos"
   ON public.scenes FOR INSERT
   WITH CHECK (
     EXISTS (
       SELECT 1 FROM public.projects 
       WHERE projects.id = scenes.project_id 
       AND (
         projects.user_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM public.project_collaborators 
           WHERE project_collaborators.project_id = projects.id 
           AND project_collaborators.user_id = auth.uid() 
           AND project_collaborators.role = 'editor'
         )
       )
     )
   );

   CREATE POLICY "Usuarios pueden actualizar escenas de sus proyectos"
   ON public.scenes FOR UPDATE
   USING (
     EXISTS (
       SELECT 1 FROM public.projects 
       WHERE projects.id = scenes.project_id 
       AND (
         projects.user_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM public.project_collaborators 
           WHERE project_collaborators.project_id = projects.id 
           AND project_collaborators.user_id = auth.uid() 
           AND project_collaborators.role = 'editor'
         )
       )
     )
   );

   CREATE POLICY "Usuarios pueden eliminar escenas de sus proyectos"
   ON public.scenes FOR DELETE
   USING (
     EXISTS (
       SELECT 1 FROM public.projects 
       WHERE projects.id = scenes.project_id 
       AND (
         projects.user_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM public.project_collaborators 
           WHERE project_collaborators.project_id = projects.id 
           AND project_collaborators.user_id = auth.uid() 
           AND project_collaborators.role = 'editor'
         )
       )
     )
   );
   `

    // Ejecutar el SQL
    const { error } = await supabase.rpc("exec_sql", { sql: policiesSQL })

    if (error) {
      console.error("Error executing SQL:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Database policies updated successfully" })
  } catch (error: any) {
    console.error("Error setting up database:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
