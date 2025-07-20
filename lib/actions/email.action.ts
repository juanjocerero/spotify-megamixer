'use server';

import { Resend } from 'resend';
import { ContactEmailTemplate } from '@/components/emails/ContactEmailTemplate';

// Enviar correo electrónico de contacto
export async function sendContactEmailAction(formData: {
  name: string;
  email: string;
  subject:string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const { name, email, subject, message } = formData;
  
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_EMAIL_TO) {
    console.error("Las variables de entorno de Resend no están configuradas.");
    return { success: false, error: "El servicio de correo no está configurado." };
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    await resend.emails.send({
      from: 'Spotify Megamixer <onboarding@resend.dev>',
      to: process.env.CONTACT_EMAIL_TO,
      replyTo: email,
      subject: `Nuevo Mensaje: ${subject}`,
      react: ContactEmailTemplate({ name, email, subject, message }) as React.ReactElement,
    });
    return { success: true };
  } catch (error) {
    console.error("[ACTION_ERROR:sendContactEmail]", error);
    return { success: false, error: "No se pudo enviar el mensaje." };
  }
}
