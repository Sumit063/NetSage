import { PropsWithChildren } from 'react'
import { motion } from 'framer-motion'

const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' }
  }
}

export function Page({ children }: PropsWithChildren) {
  return (
    <motion.div initial="hidden" animate="show" variants={pageVariants}>
      {children}
    </motion.div>
  )
}
