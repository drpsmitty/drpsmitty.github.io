import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AppRoutes from "./routes";

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}

