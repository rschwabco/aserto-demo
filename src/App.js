import './App.css';
import LoginButton from './components/LoginButton'
import LogoutButton from './components/LogoutButton'
import Profile from './components/Profile'

function App() {
  return (
    <div className="App" style={{padding: 20}}>
      <LoginButton />
      <LogoutButton />
      <Profile />

    </div>
  );
}

export default App;
