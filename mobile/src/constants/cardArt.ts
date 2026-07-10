import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { Card } from '../models/types';

import C2 from '../../assets/cards/clubs/2.svg';
import C3 from '../../assets/cards/clubs/3.svg';
import C4 from '../../assets/cards/clubs/4.svg';
import C5 from '../../assets/cards/clubs/5.svg';
import C6 from '../../assets/cards/clubs/6.svg';
import C7 from '../../assets/cards/clubs/7.svg';
import C8 from '../../assets/cards/clubs/8.svg';
import C9 from '../../assets/cards/clubs/9.svg';
import C10 from '../../assets/cards/clubs/10.svg';
import CJ from '../../assets/cards/clubs/j.svg';
import CQ from '../../assets/cards/clubs/q.svg';
import CK from '../../assets/cards/clubs/k.svg';
import CA from '../../assets/cards/clubs/a.svg';

import D2 from '../../assets/cards/diamonds/2.svg';
import D3 from '../../assets/cards/diamonds/3.svg';
import D4 from '../../assets/cards/diamonds/4.svg';
import D5 from '../../assets/cards/diamonds/5.svg';
import D6 from '../../assets/cards/diamonds/6.svg';
import D7 from '../../assets/cards/diamonds/7.svg';
import D8 from '../../assets/cards/diamonds/8.svg';
import D9 from '../../assets/cards/diamonds/9.svg';
import D10 from '../../assets/cards/diamonds/10.svg';
import DJ from '../../assets/cards/diamonds/j.svg';
import DQ from '../../assets/cards/diamonds/q.svg';
import DK from '../../assets/cards/diamonds/k.svg';
import DA from '../../assets/cards/diamonds/a.svg';

import H2 from '../../assets/cards/hearts/2.svg';
import H3 from '../../assets/cards/hearts/3.svg';
import H4 from '../../assets/cards/hearts/4.svg';
import H5 from '../../assets/cards/hearts/5.svg';
import H6 from '../../assets/cards/hearts/6.svg';
import H7 from '../../assets/cards/hearts/7.svg';
import H8 from '../../assets/cards/hearts/8.svg';
import H9 from '../../assets/cards/hearts/9.svg';
import H10 from '../../assets/cards/hearts/10.svg';
import HJ from '../../assets/cards/hearts/j.svg';
import HQ from '../../assets/cards/hearts/q.svg';
import HK from '../../assets/cards/hearts/k.svg';
import HA from '../../assets/cards/hearts/a.svg';

import S2 from '../../assets/cards/spades/2.svg';
import S3 from '../../assets/cards/spades/3.svg';
import S4 from '../../assets/cards/spades/4.svg';
import S5 from '../../assets/cards/spades/5.svg';
import S6 from '../../assets/cards/spades/6.svg';
import S7 from '../../assets/cards/spades/7.svg';
import S8 from '../../assets/cards/spades/8.svg';
import S9 from '../../assets/cards/spades/9.svg';
import S10 from '../../assets/cards/spades/10.svg';
import SJ from '../../assets/cards/spades/j.svg';
import SQ from '../../assets/cards/spades/q.svg';
import SK from '../../assets/cards/spades/k.svg';
import SA from '../../assets/cards/spades/a.svg';

type CardSvg = ComponentType<SvgProps>;

const CARD_IMAGES: Record<string, CardSvg> = {
  '2C': C2,
  '3C': C3,
  '4C': C4,
  '5C': C5,
  '6C': C6,
  '7C': C7,
  '8C': C8,
  '9C': C9,
  '10C': C10,
  JC: CJ,
  QC: CQ,
  KC: CK,
  AC: CA,
  '2D': D2,
  '3D': D3,
  '4D': D4,
  '5D': D5,
  '6D': D6,
  '7D': D7,
  '8D': D8,
  '9D': D9,
  '10D': D10,
  JD: DJ,
  QD: DQ,
  KD: DK,
  AD: DA,
  '2H': H2,
  '3H': H3,
  '4H': H4,
  '5H': H5,
  '6H': H6,
  '7H': H7,
  '8H': H8,
  '9H': H9,
  '10H': H10,
  JH: HJ,
  QH: HQ,
  KH: HK,
  AH: HA,
  '2S': S2,
  '3S': S3,
  '4S': S4,
  '5S': S5,
  '6S': S6,
  '7S': S7,
  '8S': S8,
  '9S': S9,
  '10S': S10,
  JS: SJ,
  QS: SQ,
  KS: SK,
  AS: SA,
};

export function getCardImage(card: Card): CardSvg {
  const image = CARD_IMAGES[card.id];
  if (!image) {
    throw new Error(`Missing card image for ${card.id}`);
  }
  return image;
}

export const CARD_WIDTH = 80;
export const CARD_HEIGHT = 116;
export const CARD_COMPACT_WIDTH = 74;
export const CARD_COMPACT_HEIGHT = 106;
/** Cards played to the table center — 40% smaller than compact hand cards. */
export const CARD_TABLE_WIDTH = Math.round(CARD_COMPACT_WIDTH * 0.6);
export const CARD_TABLE_HEIGHT = Math.round(CARD_COMPACT_HEIGHT * 0.6);
