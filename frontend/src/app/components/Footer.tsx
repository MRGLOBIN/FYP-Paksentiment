'use client'

import Link from 'next/link'
import styles from './Footer.module.scss'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          {/* Brand Section */}
          <div className={styles.footerSection}>
            <div className={styles.brand}>
              <img
                src='/Pak Sentiments.svg'
                alt='PakSentiment'
                className={styles.logoImage}
                width={36}
                height={36}
              />
              <h3 className={styles.brandName}>PakSentiment</h3>
            </div>
            <p className={styles.brandDescription}>
              AI-powered trend monitoring for the global digital
              landscape.
            </p>
          </div>

          {/* Features Section */}
          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Features</h4>
            <ul className={styles.linkList}>
              <li>
                <Link href='/features/sentiment-analysis'>
                  Sentiment Analysis
                </Link>
              </li>
              <li>
                <Link href='/features/risk-detection'>Risk Detection</Link>
              </li>
              <li>
                <Link href='/features/multi-language'>
                  Multi-language Support
                </Link>
              </li>
              <li>
                <Link href='/features/real-time'>Real-time Monitoring</Link>
              </li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Languages</h4>
            <ul className={styles.linkList}>
              <li>
                <Link href='/languages/english'>English</Link>
              </li>
              <li>
                <Link href='/languages/spanish'>Spanish</Link>
              </li>
              <li>
                <Link href='/languages/french'>French</Link>
              </li>
              <li>
                <Link href='/languages/mandarin'>Mandarin</Link>
              </li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h4 className={styles.sectionTitle}>Contact</h4>
            <ul className={styles.contactList}>
              <li>
                <a href='mailto:hello@datainsight.io'>
                  hello@datainsight.io
                </a>
              </li>
              <li>
                <a href='tel:+18001234567'>+1 800 123 4567</a>
              </li>
              <li>San Francisco, CA</li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © 2026 DataInsight Analytics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
