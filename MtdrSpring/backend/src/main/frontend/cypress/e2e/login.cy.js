describe('Inicio de Sesión', () => {

  beforeEach(() => {
    cy.visit('/')
  })

  it('Login válido redirige a /home', () => {
    cy.get('input[type="email"]').type('pruebas@pruebas.com')
    cy.get('input[type="password"]').type('pruebas123')

    cy.get('form').submit()

    cy.url().should('include', '/home')
  })

})