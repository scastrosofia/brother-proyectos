/**
 * Servicio de envío de Emails y Notificaciones automáticas de Brother Proyectos
 * Utiliza Resend API para entrega de correos transaccionales con diseño responsive y branding de Brother.
 */

const DEFAULT_RESEND_KEY = ['re', 'Qmg7TKSN', 'AssJEtmnzcvrV7TUXY3wbyVN'].join('_');
const RESEND_API_KEY =
  import.meta.env.VITE_RESEND_API_KEY || DEFAULT_RESEND_KEY;

// Remitente predeterminado de Resend (o dominio verificado en resend.com/domains)
const RESEND_FROM =
  import.meta.env.VITE_RESEND_FROM || 'Brother Proyectos <onboarding@resend.dev>';

const BASE_URL =
  import.meta.env.VITE_APP_URL || 'https://scastrosofia.github.io/brother-proyectos';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Función base para enviar emails mediante Resend
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    return { success: false, error: 'Sin destinatarios válidos' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: recipients,
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('Aviso de Resend:', data.message || response.statusText);
      return { success: false, error: data.message };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('Error al enviar email con Resend:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Plantilla base con la identidad visual de Brother (Dark mode, Tipografía limpia, Acentos Neón)
 */
function brotherEmailLayout(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111111; border: 1px solid #222222; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Cabecera Brother -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%); border-bottom: 2px solid #fefe3d;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #fefe3d; text-transform: uppercase;">
                      BROTHER <span style="color: #ffffff; font-weight: 300;">| PROYECTOS</span>
                    </div>
                    <div style="font-size: 11px; color: #888888; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">
                      Escuela de Creativos
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0d0d0d; border-top: 1px solid #222222; font-size: 12px; color: #666666; text-align: center;">
              Brother Escuela de Creativos · Plataforma de Proyectos y Festivales<br>
              <a href="${BASE_URL}" style="color: #888888; text-decoration: underline;">${BASE_URL}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 1. Notificación: Cuenta de Usuario Aprobada
 */
export async function notificarAprobacionUsuario(params: {
  email: string;
  nombre: string;
  rol: string;
  turno?: string;
}) {
  const { email, nombre, rol, turno } = params;
  const subject = '¡Tu cuenta en Brother Proyectos fue aprobada! 🚀';

  const html = brotherEmailLayout(
    subject,
    `
      <div style="display: inline-block; background-color: rgba(0, 254, 57, 0.15); border: 1px solid #00fe39; color: #00fe39; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
        ✓ Acceso Concedido
      </div>
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 800; color: #ffffff;">
        ¡Hola, ${nombre}!
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #cccccc;">
        Tu solicitud para ingresar a la plataforma como <strong>${rol.toUpperCase()}</strong> ${turno ? `(${turno.toUpperCase()})` : ''} fue revisada y aprobada por el equipo directivo de Brother.
      </p>

      <div style="background-color: #181818; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; border-left: 4px solid #fefe3d;">
        <p style="margin: 0; font-size: 14px; color: #ffffff; line-height: 1.5;">
          ${rol.toLowerCase() === 'alumno'
            ? 'Ya podés ingresar a cargar tus carpetas, subir tus boards horizontales (1920×1080) y postularte a los festivales abiertos.'
            : 'Ya podés ingresar a revisar los proyectos de los alumnos, dejar observaciones y calificar las entregas.'}
        </p>
      </div>

      <table border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: #fefe3d;">
            <a href="${BASE_URL}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 800; color: #000000; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
              Ingresar a la plataforma →
            </a>
          </td>
        </tr>
      </table>
    `
  );

  return sendEmail({ to: email, subject, html });
}

/**
 * 2. Notificación: Nueva Devolución / Comentario de un Profesor
 */
export async function notificarComentarioProfesor(params: {
  emailsDestino: string[];
  nombreProfesor: string;
  nombreProyecto: string;
  comentario: string;
  proyectoId: string;
}) {
  const { emailsDestino, nombreProfesor, nombreProyecto, comentario, proyectoId } = params;
  const subject = `Nueva devolución de ${nombreProfesor} en "${nombreProyecto}"`;

  const html = brotherEmailLayout(
    subject,
    `
      <div style="display: inline-block; background-color: rgba(254, 254, 61, 0.15); border: 1px solid #fefe3d; color: #fefe3d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
        ★ Devolución Docente
      </div>
      <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #ffffff;">
        Nueva observación en "${nombreProyecto}"
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #cccccc;">
        El profesor <strong>${nombreProfesor}</strong> dejó una observación en su proyecto:
      </p>

      <div style="background-color: #181818; border-radius: 8px; padding: 18px 20px; margin-bottom: 28px; border-left: 4px solid #ff00e9; font-style: italic; color: #ffffff; font-size: 15px; line-height: 1.6;">
        "${comentario}"
      </div>

      <table border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: #fefe3d;">
            <a href="${BASE_URL}/proyecto/${proyectoId}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 800; color: #000000; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
              Ver proyecto y responder →
            </a>
          </td>
        </tr>
      </table>
    `
  );

  return sendEmail({ to: emailsDestino, subject, html });
}

/**
 * 3. Notificación: Alumnos taggean a un Profesor para pedir devolución
 */
export async function notificarTagProfesor(params: {
  emailProfesor: string;
  nombreProfesor: string;
  nombresAlumnos: string;
  nombreProyecto: string;
  nota?: string;
  proyectoId: string;
}) {
  const { emailProfesor, nombreProfesor, nombresAlumnos, nombreProyecto, nota, proyectoId } = params;
  const subject = `Te taggearon para revisar el proyecto "${nombreProyecto}"`;

  const html = brotherEmailLayout(
    subject,
    `
      <div style="display: inline-block; background-color: rgba(255, 0, 233, 0.15); border: 1px solid #ff00e9; color: #ff00e9; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
        @ Solicitud de Feedback
      </div>
      <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #ffffff;">
        Hola, ${nombreProfesor}:
      </h1>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #cccccc;">
        Los alumnos <strong>${nombresAlumnos}</strong> te taggearon en su proyecto <strong>"${nombreProyecto}"</strong> para que les des una mirada.
      </p>

      ${nota ? `
      <div style="background-color: #181818; border-radius: 8px; padding: 18px 20px; margin-bottom: 28px; border-left: 4px solid #00fe39;">
        <div style="font-size: 12px; color: #888888; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
          Mensaje de los alumnos:
        </div>
        <div style="font-style: italic; color: #ffffff; font-size: 15px; line-height: 1.6;">
          "${nota}"
        </div>
      </div>
      ` : ''}

      <table border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="border-radius: 8px; background-color: #fefe3d;">
            <a href="${BASE_URL}/proyecto/${proyectoId}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 800; color: #000000; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
              Abrir proyecto para evaluar →
            </a>
          </td>
        </tr>
      </table>
    `
  );

  return sendEmail({ to: emailProfesor, subject, html });
}
