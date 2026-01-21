// Mock the Parametric component so it doesn't try to load the Worker during App tests
jest.mock('./containers/Parametric/Parametric', () => () => <div data-testid="mock-parametric" />);

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app without crashing', () => {
  render(<App />);
  expect(screen.getByTestId('mock-parametric')).toBeInTheDocument();
});