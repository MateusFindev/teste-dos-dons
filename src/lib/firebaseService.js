import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from './firebase'

// Salvar resultado do teste no Firebase
export const salvarResultado = async (dadosFormulario, resultados) => {
  try {
    const docRef = await addDoc(collection(db, 'resultados-teste-dons'), {
      nome: dadosFormulario.nome,
      igreja: dadosFormulario.igreja,
      respostas: dadosFormulario.respostas,
      resultados: resultados,
      dataRealizacao: new Date(),
      timestamp: Date.now()
    })
    
    console.log('Resultado salvo com ID: ', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Erro ao salvar resultado: ', error)
    throw error
  }
}

// Buscar todos os resultados (para análises futuras)
export const buscarResultados = async (limite = 100) => {
  try {
    const q = query(
      collection(db, 'resultados-teste-dons'),
      orderBy('timestamp', 'desc'),
      limit(limite)
    )
    
    const querySnapshot = await getDocs(q)
    const resultados = []
    
    querySnapshot.forEach((doc) => {
      resultados.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return resultados
  } catch (error) {
    console.error('Erro ao buscar resultados: ', error)
    throw error
  }
}

// Buscar estatísticas gerais
export const buscarEstatisticas = async () => {
  try {
    const resultados = await buscarResultados(1000) // Buscar mais dados para estatísticas
    
    if (resultados.length === 0) {
      return null
    }
    
    // Calcular estatísticas dos dons mais comuns
    const estatisticasDons = {}
    
    resultados.forEach(resultado => {
      if (resultado.resultados && Array.isArray(resultado.resultados)) {
        // Pegar os top 3 dons de cada pessoa
        const top3 = resultado.resultados.slice(0, 3)
        
        top3.forEach((dom, index) => {
          if (!estatisticasDons[dom.nome]) {
            estatisticasDons[dom.nome] = {
              nome: dom.nome,
              vezesNoTop3: 0,
              vezesEm1o: 0,
              vezesEm2o: 0,
              vezesEm3o: 0,
              pontuacaoMedia: 0,
              totalPontuacao: 0,
              contadorPontuacao: 0
            }
          }
          
          estatisticasDons[dom.nome].vezesNoTop3++
          estatisticasDons[dom.nome].totalPontuacao += dom.pontuacao
          estatisticasDons[dom.nome].contadorPontuacao++
          
          if (index === 0) estatisticasDons[dom.nome].vezesEm1o++
          else if (index === 1) estatisticasDons[dom.nome].vezesEm2o++
          else if (index === 2) estatisticasDons[dom.nome].vezesEm3o++
        })
      }
    })
    
    // Calcular médias
    Object.keys(estatisticasDons).forEach(dom => {
      if (estatisticasDons[dom].contadorPontuacao > 0) {
        estatisticasDons[dom].pontuacaoMedia = Math.round(
          estatisticasDons[dom].totalPontuacao / estatisticasDons[dom].contadorPontuacao
        )
      }
    })
    
    return {
      totalTestes: resultados.length,
      estatisticasDons: Object.values(estatisticasDons)
        .sort((a, b) => b.vezesNoTop3 - a.vezesNoTop3),
      ultimaAtualizacao: new Date()
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas: ', error)
    throw error
  }
}
