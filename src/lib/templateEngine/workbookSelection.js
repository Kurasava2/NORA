export function chooseSource(analyses, model) {
  const tokenAnalysis = analyses.find(analysis => analysis.hasTrip)
  if (tokenAnalysis) return tokenAnalysis

  if (model?.hasMotohours) {
    const motohourAnalysis =
      analyses.find(
        analysis =>
          analysis.name === String(model.shortNo) &&
          analysis.native &&
          analysis.maxCol > 11,
      ) ||
      analyses.find(
        analysis => analysis.name === '3099' && analysis.native,
      )
    if (motohourAnalysis) return motohourAnalysis
  }

  return (
    analyses.find(analysis => analysis.name === '3263' && analysis.native) ||
    analyses.find(
      analysis => analysis.name === String(model?.shortNo) && analysis.native,
    ) ||
    analyses.find(analysis => analysis.native) ||
    analyses[0]
  )
}

export function inspectionSummary(analyses) {
  const tokenAnalysis = analyses.find(analysis => analysis.hasTrip)
  const baseAnalysis =
    analyses.find(analysis => analysis.name === '3263' && analysis.native) ||
    analyses
      .filter(analysis => analysis.native)
      .sort((leftAnalysis, rightAnalysis) =>
        rightAnalysis.score - leftAnalysis.score,
      )[0] ||
    tokenAnalysis ||
    analyses[0]

  return {
    sheet: baseAnalysis?.path || null,
    sheetName: baseAnalysis?.name || null,
    mode: tokenAnalysis ? 'token' : baseAnalysis?.native ? 'native' : 'unknown',
    hasTrip: Boolean(tokenAnalysis),
    hasMaterials: Boolean(tokenAnalysis?.hasMaterials),
    hasTitle: Boolean(tokenAnalysis?.hasTitle),
    has3263: analyses.some(
      analysis => analysis.name === '3263' && analysis.native,
    ),
    has3099: analyses.some(
      analysis => analysis.name === '3099' && analysis.native,
    ),
    sheetNames: analyses.map(analysis => analysis.name),
    score: baseAnalysis?.score || 0,
  }
}
