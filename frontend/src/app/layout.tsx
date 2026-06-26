import './globals.css';

export const metadata = {
  title: 'Pluggable Chat',
  description: 'AI Chat Interface with Plug-and-Play providers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('pluggable_chat_theme') === 'dark' || (!('pluggable_chat_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 antialiased selection:bg-blue-500/30 transition-colors duration-300">
        {children}
      </body>
    </html>
  )
}
