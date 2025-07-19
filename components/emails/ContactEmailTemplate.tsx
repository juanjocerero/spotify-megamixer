'use client';

import * as React from 'react';

interface ContactEmailTemplateProps {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const ContactEmailTemplate: React.FC<Readonly<ContactEmailTemplateProps>> = ({
  name,
  email,
  subject,
  message,
}) => (
  <div>
  <h1>Nuevo mensaje desde Spotify Megamixer</h1>
  <p>
  Has recibido un nuevo mensaje de: <strong>{name}</strong> ({email}).
  </p>
  <h2>Asunto: {subject}</h2>
  <hr />
  <h3>Mensaje:</h3>
  <p>{message.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}</p>
  </div>
);

export default ContactEmailTemplate;