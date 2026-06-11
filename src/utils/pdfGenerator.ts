import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoUrl from '../assets/logo.png'

// Type definitions for the pdf generator
interface PDFReportItem {
  material: string
  quantidade: number
  tipoAvaria: string
}

interface PDFReportData {
  numero: string
  empresa: string
  responsavel: string
  data: string
  situacao: string
  observacoes: string
  totalItens: number
  itens: PDFReportItem[]
}

interface PDFVisitData {
  numero: string
  empresa: string
  responsavel: string
  data: string
  motivo: string
  atividades: string
  observacoes: string
  status: string
}

// 1. Generate PDF for Avarias
export function generateReportPDF(data: PDFReportData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO DE CONTROLE DE AVARIAS', width - margin, 50, { align: 'right' })

  // Report Number
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Nº ${data.numero}`, width - margin, 68, { align: 'right' })

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  // Report details metadata
  let y = 120
  doc.setTextColor(20)
  doc.setFontSize(11)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Empresa atendida:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.empresa || '-', margin + 130, y)
  
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Responsável:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.responsavel || '-', margin + 130, y)
  
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Data:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(data.data).toLocaleDateString('pt-BR'), margin + 130, y)

  y += 24

  // Items table
  autoTable(doc, {
    startY: y,
    head: [['Material', 'Quantidade', 'Tipo de Avaria']],
    body: data.itens.map(item => [item.material, String(item.quantidade), item.tipoAvaria || '—']),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 8 },
    margin: { left: margin, right: margin }
  })

  // Table summary info
  let finalY = (doc as any).lastAutoTable.finalY + 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`Total de itens: ${data.itens.length}`, margin, finalY)
  doc.text(`Soma das quantidades: ${data.totalItens}`, margin, finalY + 16)

  finalY += 40

  // Observations
  doc.setFont('helvetica', 'bold')
  doc.text('Observações:', margin, finalY)
  doc.setFont('helvetica', 'normal')
  const obsLines = doc.splitTextToSize(data.observacoes || '-', width - margin * 2)
  doc.text(obsLines, margin, finalY + 16)

  // Signature Block
  const sigY = height - 100
  const sigWidth = 240
  const sigStartX = (width - sigWidth) / 2
  doc.setDrawColor(120)
  doc.setLineWidth(0.5)
  doc.line(sigStartX, sigY, sigStartX + sigWidth, sigY)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Assinatura do Responsável', width / 2, sigY + 14, { align: 'center' })

  // Footer metadata
  doc.setFontSize(8)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Produtos Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF file
  doc.save(`Relatorio-${data.numero}.pdf`)
}

// 2. Generate PDF for Visitas
export function generateVisitPDF(data: PDFVisitData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 40

  // Add Logo
  try {
    doc.addImage(logoUrl, 'PNG', margin, 30, 140, 45)
  } catch (err) {
    console.error('Error adding logo to PDF:', err)
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 99) // Navy color
  doc.text('RELATÓRIO DE VISITA TÉCNICA / COMERCIAL', width - margin, 50, { align: 'right' })

  // Report Number
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Nº ${data.numero}`, width - margin, 68, { align: 'right' })

  // Red divider line
  doc.setDrawColor(180, 30, 30)
  doc.setLineWidth(2)
  doc.line(margin, 95, width - margin, 95)

  // Report details metadata
  let y = 120
  doc.setTextColor(20)
  doc.setFontSize(11)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Cliente / Empresa:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.empresa || '-', margin + 130, y)
  
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Responsável:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.responsavel || '-', margin + 130, y)
  
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Data da Visita:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(data.data).toLocaleDateString('pt-BR'), margin + 130, y)

  y += 18
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.status || '-', margin + 130, y)

  // Parse structured JSON if available
  let structured: any = null
  if (data.observacoes) {
    try {
      const parsed = JSON.parse(data.observacoes)
      if (parsed && typeof parsed === 'object' && ('horarioChegada' in parsed || 'pontoExtra' in parsed)) {
        structured = parsed
      }
    } catch (e) {}
  }

  if (structured) {
    // Render local/city info
    y += 18
    doc.setFont('helvetica', 'bold')
    doc.text('Cidade / Bairro:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(data.motivo || '-', margin + 130, y)

    y += 35

    // Checklist table
    const tableBody = [
      ['Horário de Chegada', structured.horarioChegada || '-'],
      ['Horário de Saída', structured.horarioSaida || '-'],
      ['Ponto Extra', structured.pontoExtra || '-'],
      ['Tipo de Ponto Extra', structured.tipoPontoExtra.join(', ') + (structured.tipoPontoExtraOutro ? ` (${structured.tipoPontoExtraOutro})` : '')],
      ['Materiais Positivados (Merchan)', structured.materiaisPositivados.join(', ') + (structured.materiaisPositivadosOutro ? ` (${structured.materiaisPositivadosOutro})` : '')],
      ['Preço', structured.preco.join(', ') || '-'],
      ['Situação do Estoque', structured.situacaoEstoque || '-'],
      ['Ruptura', structured.ruptura || '-']
    ]

    autoTable(doc, {
      startY: y,
      head: [['Campo de Verificação', 'Resposta']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 99], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 8 },
      margin: { left: margin, right: margin }
    })
  } else {
    y += 35

    // Reason
    doc.setFont('helvetica', 'bold')
    doc.text('Motivo / Assunto Principal:', margin, y)
    doc.setFont('helvetica', 'normal')
    const motivoLines = doc.splitTextToSize(data.motivo || '-', width - margin * 2)
    doc.text(motivoLines, margin, y + 16)

    y += 16 + motivoLines.length * 14 + 20

    // Activities
    doc.setFont('helvetica', 'bold')
    doc.text('Atividades Realizadas:', margin, y)
    doc.setFont('helvetica', 'normal')
    const atividadesLines = doc.splitTextToSize(data.atividades || '-', width - margin * 2)
    doc.text(atividadesLines, margin, y + 16)

    y += 16 + atividadesLines.length * 14 + 20

    // Observations
    doc.setFont('helvetica', 'bold')
    doc.text('Observações / Próximos Passos:', margin, y)
    doc.setFont('helvetica', 'normal')
    const obsLines = doc.splitTextToSize(data.observacoes || '-', width - margin * 2)
    doc.text(obsLines, margin, y + 16)
  }

  // Signature Block
  const sigY = height - 100
  const sigWidth = 240
  const sigStartX = (width - sigWidth) / 2
  doc.setDrawColor(120)
  doc.setLineWidth(0.5)
  doc.line(sigStartX, sigY, sigStartX + sigWidth, sigY)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Assinatura do Responsável', width / 2, sigY + 14, { align: 'center' })

  // Footer metadata
  doc.setFontSize(8)
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} • Produtos Do Mestre`,
    width / 2,
    height - 30,
    { align: 'center' }
  )

  // Save PDF file
  doc.save(`Visita-${data.numero}.pdf`)
}
