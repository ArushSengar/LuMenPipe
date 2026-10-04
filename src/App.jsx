import React from 'react';
import Landing from './Landing.jsx';
import Sender from './sender/Sender.jsx';
import Receiver from './receiver/Receiver.jsx';

function getRoute() {
  const hash = window.location.hash;
  if (hash === '#/send') return 'send';
  if (hash === '#/receive') return 'receive';
  return 'landing';
}

export default function App() {
  const [route, setRoute] = React.useState(getRoute);

  React.useEffect(() => {
    function onHashChange() {
      setRoute(getRoute());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === 'send') return <Sender />;
  if (route === 'receive') return <Receiver />;
  return <Landing />;
}
