'use client'

import Image from 'next/image'
import { ArrowUpRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import styles from './landing.module.css'

type ResultImage = {
  src: string
  alt: string
}

export type ResultCaseStudy = {
  images: ResultImage[]
  category: 'growth' | 'revenue'
  name: string
  result: string
  context: string
  story: string
}

type ResultsShowcaseProps = {
  results: ResultCaseStudy[]
}

const resultGroups = [
  {
    key: 'growth' as const,
    number: '01',
    eyebrow: 'Audience growth',
    title: 'Build attention people can feel.',
    copy: 'Members finding their format, growing faster, and reaching people far beyond their existing audience.',
  },
  {
    key: 'revenue' as const,
    number: '02',
    eyebrow: 'Clients & revenue',
    title: 'Turn that attention into a business.',
    copy: 'Members packaging what they know, making the offer, and collecting their first—or biggest—payments.',
  },
]

const resultImpact = [
  { value: '24M', label: 'views', detail: 'Dino' },
  { value: '64K', label: 'followers from 1.5K', detail: 'Zack' },
  { value: '$10K', label: 'in one day', detail: 'Michael' },
  { value: '3 weeks', label: 'to first client', detail: 'Brett' },
]

export default function ResultsShowcase({ results }: ResultsShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null)
  const activeResult = activeIndex === null ? null : results[activeIndex]

  useEffect(() => {
    const dialog = dialogRef.current

    if (activeIndex !== null && dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [activeIndex])

  function openCaseStudy(index: number, event: MouseEvent<HTMLButtonElement>) {
    lastTriggerRef.current = event.currentTarget
    setActiveIndex(index)
  }

  function closeCaseStudy() {
    dialogRef.current?.close()
  }

  function handleDialogClose() {
    setActiveIndex(null)
    lastTriggerRef.current?.focus()
  }

  return (
    <>
      <div className={styles.resultImpact} aria-label="Selected Creator Cult results">
        {resultImpact.map((item) => (
          <div className={styles.resultImpactItem} key={`${item.value}-${item.label}`}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
            <small>{item.detail}</small>
          </div>
        ))}
      </div>

      <div className={styles.resultGroups}>
        {resultGroups.map((group) => {
          const groupResults = results
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.category === group.key)

          return (
            <section className={styles.resultGroup} aria-labelledby={`result-group-${group.key}`} key={group.key}>
              <div className={styles.resultGroupHeader}>
                <span className={styles.resultGroupNumber}>{group.number}</span>
                <div>
                  <p>{group.eyebrow}</p>
                  <h3 id={`result-group-${group.key}`}>{group.title}</h3>
                  <span>{group.copy}</span>
                </div>
                <small>{groupResults.length} member wins</small>
              </div>

              <div className={styles.resultGrid}>
                {groupResults.map(({ item, index }) => (
                  <article className={styles.resultCard} key={`${item.name}-${item.result}`}>
                    <button
                      type="button"
                      className={styles.resultTrigger}
                      aria-label={`View ${item.name} case study: ${item.result}`}
                      aria-haspopup="dialog"
                      aria-controls="member-case-study"
                      onClick={(event) => openCaseStudy(index, event)}
                    >
                      <span className={styles.resultImageWrap}>
                        <Image
                          src={item.images[0].src}
                          alt=""
                          fill
                          loading={index === 0 ? 'eager' : 'lazy'}
                          sizes="(max-width: 480px) 92vw, (max-width: 860px) 46vw, 31vw"
                          className={styles.resultImage}
                        />
                        {item.images.length > 1 && (
                          <span className={styles.resultProofCount}>{item.images.length} proof screenshots</span>
                        )}
                      </span>
                      <span className={styles.resultText}>
                        <span className={styles.resultName}>{item.name}</span>
                        <strong className={styles.resultTitle}>{item.result}</strong>
                        <span className={styles.resultContext}>{item.context}</span>
                        <span className={styles.resultLink}>See the proof <ArrowUpRight size={14} /></span>
                      </span>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <dialog
        ref={dialogRef}
        id="member-case-study"
        className={styles.caseStudyDialog}
        aria-labelledby={activeResult ? 'case-study-title' : undefined}
        onClose={handleDialogClose}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            closeCaseStudy()
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeCaseStudy()
        }}
      >
        {activeResult && (
          <div className={styles.caseStudyModal}>
            <button
              type="button"
              className={styles.caseStudyClose}
              onClick={closeCaseStudy}
              aria-label="Close case study"
              autoFocus
            >
              <X size={20} />
            </button>

            <div className={styles.caseStudyGallery} aria-label={`${activeResult.name} result proof`}>
              {activeResult.images.map((image, index) => (
                <figure className={styles.caseStudySlide} key={image.src}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 760px) 92vw, 48vw"
                    className={styles.caseStudyImage}
                  />
                  {activeResult.images.length > 1 && (
                    <figcaption>Proof {index + 1} of {activeResult.images.length}</figcaption>
                  )}
                </figure>
              ))}
            </div>

            <div className={styles.caseStudyCopy}>
              <p className={styles.caseStudyEyebrow}>Creator Cult member result</p>
              <h3 id="case-study-title">{activeResult.result}</h3>
              <p className={styles.caseStudyName}>{activeResult.name}</p>
              <div className={styles.caseStudyContext}>
                <span>Context</span>
                <p>{activeResult.context}</p>
              </div>
              <p className={styles.caseStudyStory}>{activeResult.story}</p>
              {activeResult.images.length > 1 && (
                <p className={styles.caseStudyHint}>Swipe or scroll the proof to see the full progression.</p>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
