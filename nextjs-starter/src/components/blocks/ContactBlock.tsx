'use client'
import type { ContactBlock } from '@/lib/types'

interface ContactBlockProps {
  data: ContactBlock
}

export default function ContactBlock({ data }: ContactBlockProps) {
  return (
    <section className="contact-block">
      <h2>Contacto</h2>
      <div className="contact-info">
        {data.email && (
          <p>
            <strong>Email:</strong>{' '}
            <a href={`mailto:${data.email}`}>{data.email}</a>
          </p>
        )}
        {data.phone && (
          <p>
            <strong>Teléfono:</strong>{' '}
            <a href={`tel:${data.phone}`}>{data.phone}</a>
          </p>
        )}
        {data.address && (
          <p>
            <strong>Dirección:</strong> {data.address}
          </p>
        )}
      </div>
      {data.mapUrl && (
        <div className="map">
          <iframe
            src={data.mapUrl}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
      <style jsx>{`
        .contact-block {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .contact-block h2 {
          font-size: 2rem;
          margin-bottom: 1.5rem;
        }
        .contact-info {
          margin-bottom: 2rem;
        }
        .contact-info p {
          margin-bottom: 0.5rem;
        }
        .contact-info a {
          color: var(--primary-color);
        }
        .map {
          border-radius: 8px;
          overflow: hidden;
        }
      `}</style>
    </section>
  )
}
