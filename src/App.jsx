// import { useState } from 'react'
import { Row, Col, Container } from "react-bootstrap";
import Logos from "./assets";
import "./App.css";

function App() {
  return (
    <>
      <Container fluid className="container">
        <Row className="header">
          <Col className="header-col">
            <button>Articles</button>
          </Col>
          <Col>
            <a href="/">
              <img src={Logos.LogoWhite} alt="AF Logo" className="af-logo" />
            </a>
          </Col>
          <Col className="header-col">
            <button>AF Partnership Program</button>
          </Col>
        </Row>
        <Row className="main-body">
          <Col>
            <h1 className="main-message">Athletic Finance simplifies business x sports.</h1>
            <button className= "join-button">Join</button>
          </Col>
          
        </Row>
        <Row className="footer-row">
          <Col xs="auto">
             <button className="footer-button" >Enquiries</button>
          </Col>
          <Col xs="auto">
             <button className="footer-button">Legal</button>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default App;
