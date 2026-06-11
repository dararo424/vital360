import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y privacidad · Vital360",
};

export default function LegalPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8">
      <Link
        href="/login"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Volver
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Términos y política de privacidad
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Última actualización: junio de 2026
      </p>

      <div className="prose prose-sm mt-6 max-w-none space-y-6 text-sm leading-relaxed">
        {/* Aviso médico */}
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h2 className="text-base font-semibold">⚕️ No es consejo médico</h2>
          <p className="mt-1 text-muted-foreground">
            Vital360 es una herramienta de apoyo para registrar nutrición y
            ejercicio. Las metas de calorías, los planes y las estimaciones (incluidas
            las generadas por inteligencia artificial) son <strong>aproximados y
            editables</strong>, y <strong>no sustituyen</strong> la orientación de un
            médico, nutricionista o profesional de la salud. Valida siempre tus
            decisiones con un profesional, especialmente si tienes alguna condición de
            salud, estás embarazada o tomas medicación.
          </p>
        </section>

        {/* Datos que recopilamos */}
        <section>
          <h2 className="text-base font-semibold">1. Qué datos recopilamos</h2>
          <p className="mt-1 text-muted-foreground">
            Para que la app funcione guardamos los datos que tú ingresas, que pueden
            incluir <strong>datos de salud sensibles</strong>:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Perfil: nombre, correo, sexo, fecha de nacimiento, estatura.</li>
            <li>Peso y medidas corporales, y tus metas.</li>
            <li>Comidas registradas (alimentos, cantidades, fotos de platos).</li>
            <li>Fotos de progreso corporal (si decides subirlas).</li>
            <li>Entrenos, recetas, planes y registros de hidratación.</li>
          </ul>
        </section>

        {/* Dónde se guardan */}
        <section>
          <h2 className="text-base font-semibold">2. Dónde se guardan</h2>
          <p className="mt-1 text-muted-foreground">
            Tus datos se almacenan en <strong>Supabase</strong> (base de datos y
            almacenamiento). El acceso está protegido por reglas de seguridad: cada
            usuario solo puede ver sus propios datos. Las fotos de progreso se guardan
            en un bucket <strong>privado</strong>; solo se muestran mediante enlaces
            temporales firmados.
          </p>
        </section>

        {/* IA */}
        <section>
          <h2 className="text-base font-semibold">3. Inteligencia artificial</h2>
          <p className="mt-1 text-muted-foreground">
            Algunas funciones usan IA de <strong>Google (Gemini)</strong>. Cuando
            analizas una foto de comida, generas un plan, sugieres una receta o creas
            la lista de mercado, el texto o la imagen correspondiente se envía a Google
            para procesarlo y devolver el resultado. No envíes por estos medios
            información que no quieras compartir con el proveedor de IA.
          </p>
        </section>

        {/* Quién puede ver */}
        <section>
          <h2 className="text-base font-semibold">4. Quién puede ver tus datos</h2>
          <p className="mt-1 text-muted-foreground">
            Solo tú. La única excepción es si <strong>conectas a un nutricionista o
            coach</strong> con un código de invitación: en ese caso, esa persona podrá
            ver tu progreso (peso, adherencia, fotos de progreso) y fijar tus metas,
            mientras el vínculo esté activo. Puedes <strong>desconectarlo</strong> en
            cualquier momento desde Ajustes.
          </p>
        </section>

        {/* Conservación y borrado */}
        <section>
          <h2 className="text-base font-semibold">5. Conservación y eliminación</h2>
          <p className="mt-1 text-muted-foreground">
            Puedes borrar tus registros (comidas, pesos, fotos, etc.) desde la app en
            cualquier momento. Si deseas eliminar tu cuenta y todos tus datos,
            solicítalo al responsable de la app y se eliminarán de forma permanente.
          </p>
        </section>

        {/* Términos de uso */}
        <section>
          <h2 className="text-base font-semibold">6. Términos de uso</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Usas Vital360 bajo tu responsabilidad. No es un dispositivo médico ni
              brinda diagnósticos.
            </li>
            <li>
              Debes ser mayor de edad o contar con la autorización de un adulto
              responsable.
            </li>
            <li>
              Eres responsable de la veracidad de los datos que ingresas y de mantener
              tus credenciales seguras.
            </li>
            <li>
              La app se ofrece &ldquo;tal cual&rdquo;, sin garantías de exactitud de
              las estimaciones nutricionales o de IA.
            </li>
          </ul>
        </section>

        {/* Bienestar */}
        <section className="rounded-xl border bg-muted/40 p-4">
          <h2 className="text-base font-semibold">💚 Tu bienestar primero</h2>
          <p className="mt-1 text-muted-foreground">
            Esta app no promueve déficits calóricos agresivos ni pesos por debajo de un
            rango saludable. Si sientes que tu relación con la comida, el peso o el
            ejercicio te genera angustia, no estás solo/a: habla con un profesional de
            la salud o con alguien de confianza. Tu salud vale más que cualquier número.
          </p>
        </section>
      </div>
    </main>
  );
}
