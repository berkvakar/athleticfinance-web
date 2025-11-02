import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import Logos from './assets';
import { motion } from 'framer-motion';
import { devSignOut } from './api/auth';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const shouldAnimate = !!location.state?.animate;
  const direction = location.state?.dir === 'reverse' ? 'reverse' : 'forward';
  const variants = direction === 'reverse'
    ? {
        initial: { x: '-100%' },
        animate: { x: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } }
      }
    : {
        initial: { x: '100%' },
        animate: { x: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } }
      };

  const handleDevSignOut = async () => {
    await devSignOut();
    navigate('/', { replace: true });
      };

  return (
    <>
      <Row className="header">
        <Col className="header-col">
          <Link to="/articles"><button>Articles</button></Link>
        </Col>
        <Col>
          <Link
            to="/"
            state={
              (location.pathname === '/join' || location.pathname === '/plans')
                ? { animate: true, dir: 'reverse' }
                : undefined
            }
          >
            <img src={Logos.LogoWhite} alt="AF Logo" className="af-logo" />
          </Link>
        </Col>
        <Col className="header-col">
          <Link to="/partnership"><button>AF Partnership</button></Link>
        </Col>
      </Row>
      <Row className='main-body'>
        <main>
          {shouldAnimate ? (
            <motion.div key={location.pathname} variants={variants} initial="initial" animate="animate">
              <Outlet />
            </motion.div>
          ) : (
            <Outlet />
          )}
        </main>
      </Row>
      <Row className="footer-row">
        <Col xs="auto">
          <Link to="/enquiries"><button className="footer-button">Enquiries</button></Link>
        </Col>
        <Col xs="auto">
          <Link to="/legal"><button className="footer-button">Legal</button></Link>
        </Col>
        <Col xs="auto">
          <button 
            className="footer-button" 
            onClick={handleDevSignOut}
            style={{ fontSize: '12px', opacity: 0.6 }}
          >
            Dev: Sign Out
          </button>
        </Col>
      </Row>
    </>
  );
}