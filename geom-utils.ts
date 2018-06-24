import { RNG } from "./RNG";
import * as S from "./SVG"

export enum HandleType { SMOOTH, CUSP }

export class Pt{
  // x:number
  // y:number

  constructor(public x:number = 0, public y:number = 0){}

  clone(): Pt { return new Pt(this.x, this.y)}

  len(): number { return Math.sqrt(this.x*this.x + this.y*this.y)}
  norm() {
    let l = this.len()
    this.x /= l
    this.y /= l
  }
}
export class Bezier{
  // https://github.com/rougier/gl-bezier/blob/master/cubic_bezier.py
  constructor(public readonly x0:number, public readonly y0:number,
    public readonly x1:number, public readonly y1:number,
    public readonly x2:number, public readonly y2:number,
    public readonly x3:number, public readonly y3:number)
  {

  }

  // TODO optimize
  eval(t:number, out:Pt)
  {
    let t1 = 1-t

    let k1 = t1 * t1 * t1
    let k2 = 3 * t * t1 * t1
    let k3 = 3 * t * t * t1
    let k4 = t * t * t

    out.x = 
        this.x0 * k1 + 
        this.x1 * k2 + 
        this.x2 * k3 + 
        this.x3 * k4;

    out.y = 
        this.y0 * k1 + 
        this.y1 * k2 + 
        this.y2 * k3 + 
        this.y3 * k4;
  }

  public split(t:number)
  {
    // Split curve at t into left and right cubic bezier curves

    let left_x0 = this.x0
    let left_y0 = this.y0
    let left_x1 = this.x0 + t*(this.x1-this.x0)
    let left_y1 = this.y0 + t*(this.y1-this.y0)
    let left_x2 = this.x1 + t*(this.x2-this.x1)
    let left_y2 = this.y1 + t*(this.y2-this.y1)
    let right_x2 = this.x2 + t*(this.x3-this.x2)
    let right_y2 = this.y2 + t*(this.y3-this.y2)
    let right_x1 = left_x2 + t*(right_x2-left_x2)
    let right_y1 = left_y2 + t*(right_y2-left_y2)
    left_x2 = left_x1 + t*(left_x2-left_x1)
    left_y2 = left_y1 + t*(left_y2-left_y1)
    var right_x0, right_y0
    let left_x3 = right_x0 = left_x2 + t*(right_x1-left_x2)
    let left_y3 = right_y0 = left_y2 + t*(right_y1-left_y2)
    let right_x3 = this.x3
    let right_y3 = this.y3
    return [new Bezier(left_x0, left_y0, left_x1, left_y1,
                       left_x2, left_y2, left_x3, left_y3),
              new Bezier(right_x0, right_y0, right_x1, right_y1,
                         right_x2, right_y2, right_x3, right_y3)
        ]
  }

  toPath(): S.GPath
  {
    let p = new S.GPath()
    p.moveTo(this.x0, this.y0)
    p.curve3(this.x1, this.y1, this.x2, this.y2, this.x3, this.y3)

    return p
  }

}

/**
 * Given a cubic beier (given as r theta instead of x, y,
 * Create a shell around it.
 * @param spr1 
 * @param spr2 
 * @param spr3 
 * @param a0_rad 
 * @param a1_rad 
 * @param a2_rad 
 * @param x0 
 * @param y0 
 * @param width0 
 * @param width1 
 * @param width2 
 * @param smooth_top 
 */
export function makeShell(spr1:number, spr2:number, spr3:number,
  a0_rad:number, a1_rad:number, a2_rad:number,
  x0:number, y0:number,
  width0:number, width1:number, width2:number, smooth_top:boolean)
  : [Bezier, PolyCurve3]
{
  // Spine coords, pt 0 being .5, 1
  let spx1 = x0 + Math.sin(a0_rad) * spr1
  let spy1 = y0 - Math.cos(a0_rad) * spr1

  let spx2 = spx1 + Math.sin(a1_rad) * spr2
  let spy2 = spy1 - Math.cos(a1_rad) * spr2

  let spx3 = spx2 + Math.sin(a2_rad) * spr3
  let spy3 = spy2 - Math.cos(a2_rad) * spr3

  let dx0 = Math.cos(a0_rad) * width0
  let dy0 = Math.sin(a0_rad) * width0

  // Offset of side points from spine
  let dx1 = Math.cos((a0_rad+a1_rad)/2) * width1
  let dy1 = Math.sin((a0_rad+a1_rad)/2) * width1

  let dx2 = Math.cos(smooth_top?a2_rad:(a1_rad+a2_rad)/2) * width2
  let dy2 = Math.sin(smooth_top?a2_rad:(a1_rad+a2_rad)/2) * width2

  let p = new PolyCurve3()
  p.start(x0 - dx0, y0 - dy0)

  p.cuspCurve3(
  spx1 - dx1, spy1 - dy1,
  (smooth_top?spx3:spx2) - dx2,
      (smooth_top?spy3:spy2) - dy2,
  spx3, spy3
  )

  p.cuspCurve3(
  (smooth_top?spx3:spx2) + dx2,
    (smooth_top?spy3:spy2) + dy2,
  spx1 + dx1, spy1 + dy1,
  x0 + dx0, y0 + dy0
  )

  return [new Bezier(x0, y0, spx1, spy1, spx2, spy2, spx3, spy3),
        p]
}

export class PolyCurve3
{
  x:number[] = []
  y:number[] = []
  type:HandleType[] = []

  start(x:number, y:number)
  {
    this.x.push(x)
    this.y.push(y)
  }

  smoothCurve3(x1:number, y1:number, x2:number, y2:number, 
         x3:number, y3:number)
  {
    this.x.push(x1); this.y.push(y1);
    this.x.push(x2); this.y.push(y2);
    this.x.push(x3); this.y.push(y3);

    this.type.push(HandleType.SMOOTH)
  }

  cuspCurve3(x1:number, y1:number, x2:number, y2:number, 
        x3:number, y3:number)
  {
    this.x.push(x1); this.y.push(y1);
    this.x.push(x2); this.y.push(y2);
    this.x.push(x3); this.y.push(y3);

    this.type.push(HandleType.CUSP)
  }

  toPath(): S.GPath
  {
    let p = new S.GPath()
    p.moveTo(this.x[0], this.y[0])

    for (let i = 1; i+2 < this.x.length; i+=3)
    {
      p.curve3(this.x[i], this.y[i],
               this.x[i+1], this.y[i+1],
               this.x[i+2], this.y[i+2])
    }

    return p
  }

  clone() : PolyCurve3
  {
    let pc = new PolyCurve3()

    pc.x = this.x.slice()
    pc.y = this.y.slice()
    pc.type = this.type.slice()

    return pc
  }

  perturb(rand:RNG, amtx:number, amty:number)
  {

  }

  /*TODO NOTE: is start guaranteed == last? */
  keepSmooth()
  {
    
  }
}



/**
 * A polygon, each point can be cusp or smooth. Can be 
 * converted to a quadratic curve.
 */
export class PolyQuadLine
{
  x:number[] = []
  y:number[] = []
  type:HandleType[] = []

  closed = false
  len()
  {
    return this.x.length
  }

  clear()
  {
    this.x = []
    this.y = []
    this.type = []
  }

  add(x:number, y:number, after?:number)
  {
    if (after != undefined)
    {
      this.x.splice(after+1, 0, x)
      this.y.splice(after+1, 0, y)
      this.type.splice(after+1, 0, HandleType.SMOOTH)
    }
    else
    {
      this.x.push(x)
      this.y.push(y)
      this.type.push(HandleType.SMOOTH)
    }
    
  }

  togglePt(i:number)
  {
    if (i < 0 || i > this.len())
      return

    if (this.type[i] == HandleType.CUSP)
      this.type[i] = HandleType.SMOOTH
    else if (this.type[i] == HandleType.SMOOTH)
      this.type[i] = HandleType.CUSP
  }  
  deletePt(i:number)
  {
    if (i < 0 || i > this.len())
      return

    this.x.splice(i, 1)
    this.y.splice(i, 1)
    this.type.splice(i, 1)
  }

  toPolyD() : string
  {
    if (this.len() < 1) return "";
    let x = this.x, y=this.y
    let s = `M${x[0]} ${y[0]} `;

    for (let i = 1; i < x.length; i++)
    {
      s+= `L${x[i]} ${y[i]} `
    }

    if (this.closed)
      s+="Z"

    return s
  }

  toCurveD() : string
  {
    let l = this.len()
    if (l < 1) return "";
    let x = this.x, y=this.y
    let s = `M${x[0]} ${y[0]} `;

    let last = x.length - 1
    for (let i = 0; i+1 < x.length; i++)
    {
      let i2 = (i+1)%l
      let i3 = (i+2)%l

      if (i2 == 0 || (!this.closed && i2 == last) || this.type[i2] == HandleType.CUSP)
      {
        s+= `L${x[i2]} ${y[i2]}`
      }
      else if (i3 == 0 || (!this.closed && i3 == last) || this.type[i3] == HandleType.CUSP)
      {
        s+= `Q${x[i2]} ${y[i2]},${x[i3]} ${y[i3]}`
        i++
      }
      else
      {
        let x3 = (x[i2]+x[i3])/2
        let y3 = (y[i2]+y[i3])/2

        s+= `Q${x[i2]} ${y[i2]},${x3} ${y3}`
      }
    }

    if (this.closed)
      s+="Z"

    return s
  }

}
