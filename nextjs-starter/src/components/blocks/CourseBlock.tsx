'use client'
import type { CourseBlock } from '@/lib/types'

interface CourseBlockProps {
  data: CourseBlock
}

export default function CourseBlock({ data }: CourseBlockProps) {
  return (
    <div className="course-block">
      <h3>{data.title}</h3>
      {data.description && <p>{data.description}</p>}
      {data.price && <span className="price">{data.price}€</span>}
      {data.duration && <p className="duration">Duración: {data.duration}</p>}
      {data.lessons && data.lessons.length > 0 && (
        <ul className="lessons">
          {data.lessons.map((lesson, i) => (
            <li key={i}>
              <strong>{lesson.title}</strong>
              {lesson.description && <p>{lesson.description}</p>}
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .course-block {
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1rem;
        }
        .course-block h3 {
          margin-bottom: 0.5rem;
        }
        .price {
          font-weight: 700;
          color: var(--primary-color);
          font-size: 1.25rem;
        }
        .duration {
          color: var(--secondary-color);
        }
        .lessons {
          list-style: none;
          margin-top: 1rem;
        }
        .lessons li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }
      `}</style>
    </div>
  )
}
