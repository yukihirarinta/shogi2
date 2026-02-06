import ShogiBoard from './components/ShogiBoard';

export default function App() {
  return (
    <main>
      <h1>将棋盤コンポーネント</h1>
      <p>クリック/タップで駒を選択して移動できます。</p>
      <ShogiBoard />
    </main>
  );
}
