import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NLP ChatBot | Intelligent Customer Support",
  description: "Intelligent Chatbot for Automated Customer Support powered by Natural Language Processing — featuring intent recognition, entity extraction, sentiment analysis, and real-time NLP insights.",
  keywords: "NLP, Chatbot, Customer Support, Natural Language Processing, Intent Recognition, Sentiment Analysis, AI Assistant",
  authors: [{ name: "NLP Chatbot Research Team" }],
  openGraph: {
    title: "NLP Customer Support Chatbot",
    description: "Intelligent Automated Customer Support Using Natural Language Processing",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="neural-bg mesh-grid min-h-screen">
        {children}
      </body>
    </html>
  );
}
