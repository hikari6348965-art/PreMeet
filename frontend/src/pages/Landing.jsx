import React from 'react'
import Header from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import Problem from '@/components/landing/problem';
import Features from '@/components/landing/features';
import Integrations from '@/components/landing/integration';
import Reviews from '@/components/landing/reviews';
import FAQ from '@/components/landing/faq';
import Footer from '@/components/landing/footer';
import './landing-motion.css';

const Landing = () => {
  return (
    <div className="premeet-page">
      <Header />
      <main>
        <Hero />
        <Problem />
        <Features />
        <Integrations />
        <Reviews />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}

export default Landing
