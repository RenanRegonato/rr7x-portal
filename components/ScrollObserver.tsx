'use client'
import { useEffect } from 'react'

export default function ScrollObserver() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    )

    document
      .querySelectorAll('.reveal, .reveal-blur, .reveal-left, .reveal-right, .stagger-reveal')
      .forEach((el) => obs.observe(el))

    return () => obs.disconnect()
  }, [])

  return null
}
