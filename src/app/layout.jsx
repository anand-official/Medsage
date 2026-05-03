import '../index.css';
import '../animations.css';

import MuiRegistry from '../components/MuiRegistry';
import Providers from './providers';

export const metadata = {
  title: 'Medsage.ai',
  description: 'AI-powered medical study companion for college-ready learning.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MuiRegistry>
          <Providers>{children}</Providers>
        </MuiRegistry>
      </body>
    </html>
  );
}
