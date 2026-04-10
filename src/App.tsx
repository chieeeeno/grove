import Sidebar from "./components/Sidebar";
import MainArea from "./components/MainArea";

function App() {
  return (
    <div className="flex h-full" style={{ backgroundColor: "var(--bg-app)" }}>
      <Sidebar />
      <MainArea />
      {/* DetailPanel は M0 では非表示（M1 以降で実装） */}
    </div>
  );
}

export default App;
