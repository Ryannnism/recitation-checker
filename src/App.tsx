import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Decks from './pages/Decks'
import DeckEditor from './pages/DeckEditor'
import Practice from './pages/Practice'
import Stats from './pages/Stats'

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          Recitation Checker
        </Link>
        <nav>
          <NavLink to="/" end>
            Decks
          </NavLink>
          <NavLink to="/stats">Stats</NavLink>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Decks />} />
          <Route path="/decks/new" element={<DeckEditor />} />
          <Route path="/decks/:deckId/edit" element={<DeckEditor />} />
          <Route path="/practice/:deckId/:mode" element={<Practice />} />
          <Route path="/stats" element={<Stats />} />
          <Route
            path="*"
            element={
              <div className="card">
                <h2>Page not found</h2>
                <Link to="/">Back to decks</Link>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  )
}
