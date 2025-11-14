
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import PostsPage from "./pages/Post";
// // /import Posts from "./pages/Post";
// import PostsPage from "./pages/Post";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
      <Route path="/posts" element={<PostsPage />} />

      </Routes>
    </BrowserRouter>
  );
}
