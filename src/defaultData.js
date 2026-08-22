export const defaultStore = {
  profile: {
    id: "demo-profile",
    fullName: "JOAO DA SILVA EXEMPLO",
    status: "ATIVO",
    cpf: "123.456.789-00",
    birthDate: "15/02/1985",
    ageLabel: "40 anos",
    motherName: "MARIA DA SILVA EXEMPLO",
    fatherName: "JOSE DA SILVA EXEMPLO",
    nationality: "BRASILEIRA",
    birthCity: "SAO PAULO",
    birthState: "SP",
    gender: "MASCULINO",
    voterId: "123456789012",
    rg: "12.222.222-X SSP/SP",
    rgIssueDate: "10/08/2005",
    rgIssuer: "SSP/SP",
    rgState: "SP",
    maritalStatus: "CASADO",
    education: "SUPERIOR COMPLETO",
    profession: "EMPRESARIO",
    income: "R$ 15.000,00"
  },
  contacts: {
    phones: ["(11) 91234-5678", "(11) 98776-5432", "(11) 95555-1234"],
    emails: ["jecoexemplo@email.com", "jecoexemplo@gmail.com", "jeco.silva@exemplo.com.br"],
    address: {
      street: "Rua das Flores",
      number: "123",
      complement: "Apto 45",
      district: "Jardim Paulista",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01415-000"
    }
  },
  indicators: {
    score: 970,
    scoreMax: 1000,
    scoreLabel: "EXCELENTE",
    rating: "AAA",
    ratingLabel: "EXCELENTE",
    ranking: "A",
    restrictionsStatus: "NADA CONSTA"
  },
  debts: [],
  credits: {
    total: "R$ 150.000,00",
    items: [
      { id: "credit-1", label: "Emprestimos", percentage: 0, amount: "R$ 0,00", color: "#1185ff" },
      { id: "credit-2", label: "Financiamentos", percentage: 0, amount: "R$ 0,00", color: "#00b85c" },
      { id: "credit-3", label: "Cartao de Credito", percentage: 0, amount: "R$ 0,00", color: "#ffcc19" },
      { id: "credit-4", label: "Outros", percentage: 0, amount: "R$ 0,00", color: "#8f44c7" }
    ]
  },
  settings: {
    logoUrl: "",
    platformName: "Scoore Admin"
  }
};
