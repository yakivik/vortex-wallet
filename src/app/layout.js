import { Inter } from "next/font/google";
import "./globals.css";

// Настраиваем шрифт Inter, который мы использовали
const inter = Inter({ subsets: ["latin", "cyrillic"] });

// Метаданные страницы (заголовок и описание)
export const metadata = {
  title: "Vortex Wallet",
  description: "Ваш безопасный крипто-кошелек",
};

// Это главный компонент-обертка для всего приложения
export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        {/* Этот div будет содержать фоновые эффекты */}
        <div className="stars-bg"></div>
        <div className="aurora-spotlight"></div>
        
        {/* Сюда Next.js будет автоматически подставлять содержимое 
          наших страниц (например, page.js) 
        */}
        {children}

        {/* В Next.js нет необходимости в отдельном компоненте GlobalStyles.
          Все кастомные стили для body, .stars-bg и .aurora-spotlight
          мы добавим в файл globals.css на следующем шаге.
        */}
      </body>
    </html>
  );
}
