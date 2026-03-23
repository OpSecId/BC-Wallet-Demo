import type { CanvasHTMLAttributes, CSSProperties, FC, SVGAttributes } from 'react'

declare module 'qrcode.react' {
  export interface QRCodeSharedProps {
    value: string | string[]
    size?: number
    level?: 'L' | 'M' | 'Q' | 'H'
    bgColor?: string
    fgColor?: string
    includeMargin?: boolean
    marginSize?: number
    minVersion?: number
    boostLevel?: boolean
    style?: CSSProperties
    title?: string
  }

  export const QRCodeCanvas: FC<QRCodeSharedProps & CanvasHTMLAttributes<HTMLCanvasElement>>
  export const QRCodeSVG: FC<QRCodeSharedProps & SVGAttributes<SVGSVGElement>>
}
