import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GoalCard from '../components/GoalCard/GoalCard'

/** GoalCard は「ほか N 件」の Link を持つので、Router の中に置いて描画する */
export function renderGoalCard(props: Parameters<typeof GoalCard>[0]) {
  return render(
    <MemoryRouter>
      <GoalCard {...props} />
    </MemoryRouter>,
  )
}
