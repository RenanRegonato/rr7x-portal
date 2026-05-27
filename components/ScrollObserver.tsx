'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Revela os elementos .reveal* quando entram na viewport. Robusto contra os
// modos que deixavam conteudo invisivel:
//  - re-observa a cada navegacao client-side (dependencia em pathname);
//  - revela imediatamente o que ja esta na viewport (rAF + timer de seguranca);
//  - se o IntersectionObserver nao existir, mostra tudo.
export default function ScrollObserver() {
  const pathname = usePathname()

  useEffect(() => {
    const SEL = '.reveal, .reveal-blur, .reveal-left, .reveal-right, .stagger-reveal'
    const els = Array.from(document.querySelectorAll<HTMLElement>(SEL))
    if (els.length === 0) return

    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('visible'))
      return
    }

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
    els.forEach((el) => obs.observe(el))

    // Rede de seguranca: revela o que esta na viewport (ou acima) mesmo que o
    // observer nao dispare (navegacao client-side, bfcache, etc.). O conteudo
    // abaixo da dobra segue animando no scroll pelo observer.
    const revealInView = () => {
      els.forEach((el) => {
        if (!el.classList.contains('visible') && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('visible')
        }
      })
    }
    const raf = requestAnimationFrame(revealInView)
    const t = setTimeout(revealInView, 600)

    return () => {
      obs.disconnect()
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [pathname])

  return null
}
