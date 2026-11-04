import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SettingsPanel, useMeterSetting } from './components/SettingsPanel'
import { installUnlockListener } from './lib/audio'
import { CardsProvider } from './lib/cards'
import { loadUserFont } from './lib/font'
import { lsGet, lsSet } from './lib/storage'
import { ROWS, type Row } from './data/kana'
import { Challenge } from './screens/Challenge'
import { Home } from './screens/Home'
import { Learn } from './screens/Learn'

type Screen = 'home' | 'learn' | 'challenge'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [settings, setSettings] = useState(false)
  const [meter, setMeter] = useMeterSetting()
  const [row, setRowState] = useState<Row>(() => ROWS.find((r) => r.id === lsGet('yomemaru:row')) ?? ROWS[0])
  const setRow = (r: Row) => {
    setRowState(r)
    lsSet('yomemaru:row', r.id)
  }

  useEffect(() => {
    installUnlockListener() // iOS/Safari：最初のタップで音をアンロック
    void loadUserFont()
  }, [])

  return (
    <CardsProvider>
      <div className="no-touch-scroll h-full overflow-hidden bg-stone-50 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <AnimatePresence mode="wait">
          <motion.div key={screen} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {screen === 'home' && <Home row={row} onRow={setRow} onLearn={() => setScreen('learn')} onChallenge={() => setScreen('challenge')} onSettings={() => setSettings(true)} />}
            {screen === 'learn' && <Learn key={row.id} row={row} onHome={() => setScreen('home')} />}
            {screen === 'challenge' && <Challenge key={row.id} row={row} onHome={() => setScreen('home')} meter={meter} />}
          </motion.div>
        </AnimatePresence>
        <SettingsPanel open={settings} onClose={() => setSettings(false)} meter={meter} setMeter={setMeter} />
      </div>
    </CardsProvider>
  )
}
