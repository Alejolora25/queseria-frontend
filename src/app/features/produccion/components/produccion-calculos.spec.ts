import { decimalPositivo, previsualizarProduccion } from './produccion-calculos';

describe('previsualización de producción', () => {
  it('suma aportes y calcula kg esperados con redondeo HALF_UP a ocho decimales', () => {
    expect(previsualizarProduccion(['20,125', '30.375'], '9,7')).toEqual({
      litrosTotales: '50,5', kgEsperados: '5,20618557',
    });
  });

  it('rechaza negativos, cero y precisión superior a la admitida', () => {
    expect(decimalPositivo('0', 3, 12)).toBeNull();
    expect(decimalPositivo('-1', 3, 12)).toBeNull();
    expect(previsualizarProduccion(['1,1234'], '10')).toBeNull();
    expect(previsualizarProduccion(['1'], '0')).toBeNull();
  });
});
