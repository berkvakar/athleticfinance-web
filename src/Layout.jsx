import { Outlet, Link } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import Logos from './assets';

export default function Layout() {
  return (
    <>
      <Row className="header">
        <Col className="header-col">
          <Link to="/articles"><button>Articles</button></Link>
        </Col>
        <Col>
          <Link to="/">
            <img src={Logos.LogoWhite} alt="AF Logo" className="af-logo" />
          </Link>
        </Col>
        <Col className="header-col">
          <Link to="/partnership"><button>AF Partnership</button></Link>
        </Col>
      </Row>
      <Row className='main-body'>
        <main>
          <Outlet /> 
        </main>
      </Row>
      <Row className="footer-row">
        <Col xs="auto">
          <Link to="/enquiries"><button className="footer-button">Enquiries</button></Link>
        </Col>
        <Col xs="auto">
          <Link to="/legal"><button className="footer-button">Legal</button></Link>
        </Col>
      </Row>
    </>
  );
}