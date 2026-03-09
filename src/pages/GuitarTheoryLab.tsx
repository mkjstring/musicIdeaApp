import { Link } from 'react-router-dom'
import { CircleOfFifths } from '../components/CircleOfFifths'
import './GuitarTheoryLab.css'

export function GuitarTheoryLab() {
  return (
    <div className="lab-page">
      <header className="lab-header">
        <Link to="/" className="lab-back-link">← Music Ideas</Link>
        <h1>Guitar Theory Lab</h1>
        <div className="lab-header-spacer" />
      </header>
      <main className="lab-main">
        <CircleOfFifths />
      </main>
    </div>
  )
}
