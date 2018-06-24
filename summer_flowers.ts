/**
 * Summer California flowers.
 */
import {RNG} from "./RNG"
import * as S from "./SVG"
import {hsbToRGB} from "./mycolor"
import {Pt, Bezier, PolyCurve3, makeShell} from "./geom-utils"

const PI = Math.PI

function DR(d:number)
{
  return d * Math.PI/180
}


enum FL_ARRANGE { SIMPLE, SPIKE, BOQ };
class PSpec
{
  // The three segments of the main ste,m and branches. The branches will
  // scale down but keep their ratios.
  public r1 = null
  public r2 = null
  public r3 = null

  // Spread of the main stem, in case there will be multiple
  // Eg for plants with ground leafs and flower stalks.
  public stem_max_a0
  // Number of main stems.
  public num_stems

  // Min and max angle a branch will make with its parent
  public branch_a0:number[]
  public branch_a1_rel:number // Max relative deviation of second segment of branch.
  // the last segment of a branch may deviate relative to the second segment
  public branch_a2_rel:number
  // Or have an absolute angle so eg they can forced to always point to the sky
  public branch_a2_abs:number
  // ^^^^^ Each of these values are relative to Y up axis!

  // How many times the branch can  have subbranches
  public branch_max_level

  // Do trees of have leaves coming firectly out of the ground? Eg: many 
  // plants with rhizomes, like daylily Iris etc.
  public ground_leaf
  public ground_leaf_num
  public ground_leaf_max_a0//spread

  // angle of leaf to branch
  public leaf_angle:number[]
  public leaf_density
  public leaf_color:string
  public leaf_color_dark:string

  // leaf segment lengths. 3 segments make the bezier
  public leaf_r1
  public leaf_r2
  public leaf_r3

  // widths are the 3 points. w0>0 only for ground leaves.
  public leaf_w0
  public leaf_w1
  public leaf_w2

  
  public flower_color:string
  public flower_color_dark:string // for shading
  public flower_r:number[] // 3 segment lens
  public flower_w:number[] // 2 widths
  public flower_round:boolean // tip if petals smooth.

  public flower_spread:number // petal spread
  public flower_num_petals:number 
  public flower_petal_order:boolean // Middle petal is inside or outside
  public flower_petal_angles:number[] // Save the deviations of petals
  public flower_scale // To use for flower formations, make flowers smaller
  public flower_arrangement:FL_ARRANGE // Arrangement type

  // Flower arrangements
  // SIMPLE: solo flower
  // SPIKE: flowers arranged on both sides of a spike
  // BOW: Multiple stalks and flowers coming out of the same point.

  public flower_spike_r1// length of flower spike segments, for spike arrangement
  public flower_spike_a0_rad // Angle between spike and flower

  public flower_boq_r1 // Boquet stalk len /3
  public flower_boq_ct // flower count
  public flower_boq_spread // angles
  public flower_boq_hair_type:boolean  // Hairy flower, only stalks in flower color
  public flower_boq_stalk_curly:number // straight or curly stalks, control deviation angles.
  public flower_boq_angles:number[] // saved stalk angles

  public twig_lg// Linear gradient for branches.

  public constructor(rand:RNG, H:number)
  {
    
    this.ground_leaf = rand.chance(.25)
    // this.ground_leaf = true

    let leaf_val = rand.nextDouble() * .4 + .3
    let leaf_hue = .2 + rand.nextDouble() * .2
    this.leaf_color = hsbToRGB(leaf_hue, 1,
              leaf_val).toHex()
    this.leaf_color_dark = hsbToRGB(leaf_hue, 1,
              leaf_val * .3).toHex()
    this.twig_lg = new S.LinearGradient(0, 0, 0, 1)
    this.twig_lg.addStop(0, this.leaf_color)
    this.twig_lg.addStop(1, this.leaf_color_dark)

    if (this.ground_leaf)
    {
      this.ground_leaf_num = rand.nextInt(6, 30)
      this.ground_leaf_max_a0 = rand.nextInt(20, 80)

      this.leaf_r1 = rand.nextInt(H * .04, H * .3)
      this.leaf_r2 = rand.nextInt(H * .04, H * .3)
      this.leaf_r3 = rand.nextInt(H * .04, H * .3)

      this.leaf_w0 = rand.nextInt(1, H/60)
      this.leaf_w1 = rand.nextInt(H/100, H/20)
      this.leaf_w2 = rand.nextInt(H/120, H/10)
    }
    else
    {
      this.leaf_r1 = rand.nextInt(H * .015, H * .1)
      this.leaf_r2 = rand.nextInt(H * .015, H * .1)
      this.leaf_r3 = rand.nextInt(H * .015, H * .1)

      this.leaf_w0 = 0
      this.leaf_w1 = rand.nextInt(H * .005, H * .035)
      this.leaf_w2 = rand.nextInt(H * .005, H * .045)
    }
    let leaf_len = this.leaf_r1 + this.leaf_r2 + this.leaf_r3

    var m = rand.nextInt(5, 60)
    this.leaf_angle = [m, m + rand.nextInt(0, 30)]

    this.leaf_density = .03 + .03 * rand.nextDouble()

    this.r1 = rand.nextInt(H/15, H/3)
    this.r2 = rand.nextInt(H/15, H/3)
    this.r3 = rand.nextInt(H/15, H/3)

    let stem_len = this.r1 + this.r2 + this.r3

    if (stem_len < leaf_len * 1.2)
    {
      let scl = leaf_len * 1.2 / stem_len

      this.r1 *= scl
      this.r2 *= scl
      this.r3 *= scl
    }

    this.num_stems = rand.pickW([1, rand.nextInt(3, 10)], [4, 1])

    this.stem_max_a0 = rand.nextInt(20, 60)

    var m = rand.nextInt(5, 60)
    this.branch_a0 = [m, m + rand.nextInt(1, 60)]
    this.branch_a1_rel = rand.nextInt(10, 60)

    if (rand.chance(.5))
    {
      this.branch_a2_rel = rand.nextInt(10, 60)
    }
    else
    {
      this.branch_a2_abs = rand.nextInt(1, 60)
    }

    if (this.num_stems == 1)
    {
      this.stem_max_a0 = rand.nextInt(1, 5)
      this.branch_a1_rel = rand.nextInt(0, 10)
      // this.branch_a2_rel = rand.nextInt(0, 20)

    }

    this.branch_max_level = 1 + (rand.chance(.2)?1:0)

    var flower_hue = -1
    while (flower_hue == -1 || (flower_hue > .2 && flower_hue < .4))
      flower_hue = rand.nextDouble()

    var flower_sat = -1, flower_val;

    if (rand.chance(.2))
    {
      // Whitish flower
      flower_sat = rand.nextDouble() * .4
      flower_val = .8 + rand.nextDouble() * .2
    }
    else
    {
      flower_sat = rand.nextDouble() * .4 + .6
      flower_val = rand.nextDouble() * .2 + .8
    }
    this.flower_color = hsbToRGB(flower_hue, flower_sat, flower_val).toHex()
    this.flower_color_dark = hsbToRGB(flower_hue, flower_sat, flower_val* (.4 + rand.nextDouble() * .4)).toHex()

    this.flower_arrangement = rand.pickW([FL_ARRANGE.SIMPLE, FL_ARRANGE.SPIKE, FL_ARRANGE.BOQ],
                                          [4, 1, 1]);

    this.flower_spike_r1 = rand.nextInt(H * .02, H * .04)
    this.flower_spike_a0_rad = rand.nextInt(10, 120) * PI/180

    this.flower_boq_r1 = rand.nextInt(H * .01, H * .02)
    this.flower_boq_ct = rand.nextInt(5, 15)
    this.flower_boq_spread = PI/6 + rand.nextDouble() * PI/2
    this.flower_boq_hair_type = rand.chance(.2)
    this.flower_boq_stalk_curly = rand.nextDouble()
    this.flower_boq_angles = makePetalAngles(this.flower_boq_ct, this.flower_boq_spread,
                           rand.chance(.5))

    this.flower_r = [ rand.nextInt(2, 15), rand.nextInt(2, 15), rand.nextInt(2, 15)]
    this.flower_w = [ rand.nextInt(2, 20), rand.nextInt(2, 20)]
    this.flower_round = rand.chance(.3)

    this.flower_num_petals = rand.nextInt(1, 8)
    if (this.flower_arrangement != FL_ARRANGE.SIMPLE)
       this.flower_num_petals = rand.nextInt(1, 3)
    
    this.flower_spread = PI * ( .3 + .7 * rand.nextDouble() )
    if (this.flower_num_petals < 4 && this.flower_spread > PI/2)
      this.flower_spread /= 2

    this.flower_petal_order = rand.chance(.5)
    this.flower_petal_angles = makePetalAngles(this.flower_num_petals, this.flower_spread, this.flower_petal_order)

    this.flower_scale = (this.flower_arrangement != FL_ARRANGE.SIMPLE)?.5:1

  }

}

function makeAngleList(rand:RNG, n:number):number[]
{
  let a = []
  let off = rand.nextInt(0, 30)

  for (let i = 0; i < n; i++)
  {
    a.push(off + i * 360 / n)
  }

  a.sort((a, b)=>{return Math.sin(DR(a)) - Math.sin(DR(b))})

  return a
}

function makeLeaf(spec:PSpec, leaf_dir:number, leaf_origin_x:number, leaf_origin_y:number,
                  width_scale: number, ground_leaf_angle_scale:number)
{
  let leaf_dir1 = leaf_dir + PI/6 * rand.nextDouble() * rand.pick([-1, 1]) * ground_leaf_angle_scale
  let leaf_dir2 = leaf_dir + PI/3 * rand.nextDouble() * rand.pick([-1, 1]) * ground_leaf_angle_scale
  let [l_spine, l_shell] = makeShell(
    spec.leaf_r1,
    spec.leaf_r2,
    spec.leaf_r3,
    leaf_dir,
    leaf_dir1,
    leaf_dir2,
    leaf_origin_x, leaf_origin_y,
    spec.leaf_w0*width_scale, spec.leaf_w1*width_scale, spec.leaf_w2*width_scale,
    false)
  
  let l_path = l_shell.toPath()
  l_path.fill = spec.leaf_color
  l_path.strokeColor = "black"
  l_path.strokeWidth = .5

  r.add(l_path)

  {
    let p_s = l_shell.clone()
    // for (let i = 0; i < l_shell.x.length; i++)
    // {
    //   p_s.x[i] += rand.nextDouble() * spec.leaf_r1 * .5
    //   p_s.y[i] += (.8 + 1 * width_scale * rand.nextDouble()) * spec.leaf_r1 * .5
    // }
  
    // leaf tip
    p_s.x[3] += (rand.nextDouble() * 2 - 1) * spec.leaf_r1 * .7
    p_s.y[3] += (.8 + 1  * rand.nextDouble()) * spec.leaf_r1 * .5

    p_s.x[2] += (rand.nextDouble() * 2 - 1.5) * spec.leaf_r1 * .5
    p_s.y[2] += (.8 + 1  * rand.nextDouble()) * spec.leaf_r1 * .5

    p_s.x[4] += (rand.nextDouble() * 2 - .5) * spec.leaf_r1 * .5
    p_s.y[4] += (.8 + 1  * rand.nextDouble()) * spec.leaf_r1 * .5


    let s_p = p_s.toPath()
    s_p.setClip(l_path)
    s_p.fill = spec.leaf_color_dark
    if (!GLOBAL_FAST)
    {
      // s_p.filter = "blur_2"
      s_p.filter = "f1"
    }
    r.add(s_p)
  }
  // if (width_scale > .1)
  // {
  //   let [p3, p4] = l_spine.split(.7 + rand.nextDouble() * .2)
    
  //   let l_mid = p3.toPath()

  //   l_mid.fill = "none"
  //   l_mid.strokeColor = "black"

  //   r.add(l_mid)
  // }

}

function makePetal(spec:PSpec, p_dir_r:number,
   leaf_origin_x:number, leaf_origin_y:number, width_scale: number,
   bend_center_amt: number,
   flower_scale:number)
{

  let [p_spine, p_shell] = makeShell(
    spec.flower_r[0] * flower_scale,
    spec.flower_r[1] * flower_scale,
    spec.flower_r[2] * flower_scale,
    p_dir_r,
    p_dir_r  - bend_center_amt * PI/6,//+ PI/6 * rand.nextDouble() * rand.pick([-1, 1]) / width_scale
    p_dir_r  - bend_center_amt * PI/2,
    leaf_origin_x, leaf_origin_y,
    0, spec.flower_w[0]*width_scale * flower_scale, spec.flower_w[1]*width_scale * flower_scale,
    spec.flower_round)
  
  let f_path = p_shell.toPath()
  f_path.fill = spec.flower_color
  f_path.strokeColor = "black"
  f_path.strokeWidth = .5

  r.add(f_path)

  let p_s = p_shell.clone()
  for (let i = 0; i < p_shell.x.length; i++)
  {
    p_s.x[i] += (rand.nextDouble() * spec.flower_r[0] * .5) * flower_scale
    p_s.y[i] += ((.5 + rand.nextDouble()) * (spec.flower_r[0]) * 1) * flower_scale
  }

  let s_p = p_s.toPath()
  s_p.setClip(f_path)
  s_p.fill = spec.flower_color_dark
  if (!GLOBAL_FAST)
    s_p.filter = "blur_2"
  r.add(s_p)
}

function makeFlower(spec:PSpec, f_dir_rad:number, f_origin_x:number, f_origin_y:number,
                  scale:number)
{
  
  for (let angle of spec.flower_petal_angles)
  {
    makePetal(spec, f_dir_rad + angle, f_origin_x, f_origin_y, Math.cos(angle), 
            angle*2/spec.flower_spread, spec.flower_scale * scale)
  }
  
}

function makePetalAngles(n:number, spread:number, reverse:boolean)
{
  let n2 = Math.floor(n/2)
  let da = spread/n

  let offa = n%2==1?da:da/2

  let a = []

  for (let i = n2-1; i >= 0; i--)
  {
    let a1 = spread/2 - i * da - offa
    a.push(a1)
    a.push(-a1)
  }

  if (n%2 == 1) a.push(0)

  if (reverse) a = a.reverse()

  return a
}

function makeTwig(spec:PSpec, scale:number,
                  a0_deg:number,
                  x0:number, y0:number,
                  lvl:number, max_level:number)
{
  let thick_scale = scale//Math.pow(.3, lvl)
  let t2 = rand.nextDouble() * .3 + .7

  let a1 = a0_deg + 
    rand.nextInt(-spec.branch_a1_rel, spec.branch_a1_rel+1)

  let a2_deg = spec.branch_a2_abs?
      rand.nextInt(-spec.branch_a2_abs, spec.branch_a2_abs+1)
      :rand.nextInt(-spec.branch_a2_abs, spec.branch_a2_abs+1)
  
  let [twig_spine, twig_shell] = makeShell(
              spec.r1 * scale,
              spec.r2 * scale,
              spec.r3 * scale,
              DR(a0_deg),
              DR(a1),
              DR(a2_deg),
              x0, y0, 5*thick_scale*t2, 3*thick_scale*t2, 2*thick_scale*t2,
              false)

  let twig_path = twig_shell.toPath()
  twig_path.strokeColor = "black"
  twig_path.strokeWidth = .5
  twig_path.fill = spec.twig_lg;//spec.leaf_color

  // Leaves
  if (!spec.ground_leaf)
  {
    let pt = new Pt()
    let pt1 = new Pt()
    let dir = 1
    let dt = spec.leaf_density / scale
    let tstart = (lvl == 0) ? .2 : .1
    let z_angle = rand.nextDouble() * PI
    for (let t = tstart; t < .7; t+= dt)
    {
      twig_spine.eval(t, pt)
      twig_spine.eval(t+.01, pt1)

      z_angle = (z_angle + 1) % (2*PI)
      let w_scale = Math.cos(z_angle)
      
      let a_t = Math.atan2(pt1.y-pt.y, pt1.x-pt.x) + Math.PI/2 
      // leaf angle
      a_t += Math.sin(z_angle) * DR(rand.nextInt(spec.leaf_angle[0], spec.leaf_angle[1]))
      
      makeLeaf(spec, a_t, pt.x, pt.y, w_scale, 1)// No angle scaling for normal leaves
     
      dir *= -1
    }
  }
  if (lvl < max_level)
  {
    let pt = new Pt()
    let pt1 = new Pt()
    let dir = 1
    for (let t = .3; t < .8; t+= .1)
    {
      twig_spine.eval(t, pt)
      twig_spine.eval(t+.01, pt1)

      let a_t = Math.atan2(pt1.y-pt.y, pt1.x-pt.x) + Math.PI/2
      let scale1 = scale * (1-t)
      makeTwig(spec, scale1,
        a_t*180/Math.PI + rand.nextInt(spec.branch_a0[0], spec.branch_a0[1]) * dir,
        pt.x, pt.y, lvl+1, max_level)

      dir *= -1
    }
  }
  r.add(twig_path)

  // if (lvl >= max_level)
  {
    // Flower
    if (spec.flower_arrangement == FL_ARRANGE.SIMPLE)
    {
      makeFlower(spec, DR(a2_deg), twig_spine.x3, twig_spine.y3, 1)
    }
    else if (spec.flower_arrangement == FL_ARRANGE.SPIKE)
    {

      let [spike_spine, shell] = makeShell(
          spec.flower_spike_r1, spec.flower_spike_r1, spec.flower_spike_r1, 
          DR(a2_deg), DR(a2_deg + -60 + rand.nextDouble() * 120), DR(a2_deg + -60 + rand.nextDouble() * 120),
        twig_spine.x3, twig_spine.y3, 0, 0, 0, false)
      let ss = spike_spine.toPath()
      ss.strokeColor = spec.leaf_color
      ss.strokeWidth = 1
      ss.fill = "none"

      r.add(ss)

      let pt = new Pt()
      let pt1 = new Pt()
      let dir = 1
      for (let t = 0; t <= 1; t+= .2)
      {
        spike_spine.eval(t, pt)
        spike_spine.eval(t+.01, pt1)
  
        let a_t = Math.atan2(pt1.y-pt.y, pt1.x-pt.x) + PI/2
        let scale1 = (1-t) * .5 + .5
        makeFlower(spec, a_t + spec.flower_spike_a0_rad,
                    pt.x, pt.y, scale1)
        makeFlower(spec, a_t - spec.flower_spike_a0_rad,
                    pt.x, pt.y, scale1)
        // makeTwig(spec, scale1,
        //   a_t*180/Math.PI + rand.nextInt(spec.branch_a0[0], spec.branch_a0[1]) * dir,
        //   pt.x, pt.y, lvl+1, max_level)
  
        dir *= -1
      }
    }
    else if (spec.flower_arrangement == FL_ARRANGE.BOQ)
    {
      for (let angle of spec.flower_boq_angles)
      {
        let st_ang_r = DR(a2_deg) + angle
        let st_ang_r2 = st_ang_r + DR(-60 + rand.nextDouble() * 120) * spec.flower_boq_stalk_curly
        let [spike_spine, shell] = makeShell(
            spec.flower_boq_r1, spec.flower_boq_r1, spec.flower_boq_r1,
            st_ang_r,
            st_ang_r + DR(-60 + rand.nextDouble() * 120) * spec.flower_boq_stalk_curly,
            st_ang_r2,
          twig_spine.x3, twig_spine.y3, 0, 0, 0, false)
        let ss = spike_spine.toPath()
        ss.strokeColor = spec.flower_boq_hair_type?spec.flower_color:spec.leaf_color_dark
        ss.strokeWidth = 1
        ss.fill = "none"

        r.add(ss)

        if (!spec.flower_boq_hair_type)
          makeFlower(spec, st_ang_r2,
                    spike_spine.x3, spike_spine.y3, 1)
      }
      // let pt = new Pt()
      // let pt1 = new Pt()
      // let dir = 1
      // for (let t = 0; t <= 1; t+= .2)
      // {
      //   spike_spine.eval(t, pt)
      //   spike_spine.eval(t+.01, pt1)
  
      //   let a_t = Math.atan2(pt1.y-pt.y, pt1.x-pt.x) + PI/2
      //   let scale1 = (1-t) * .5 + .5
      //   makeFlower(spec, a_t + spec.flower_spike_a0_rad,
      //               pt.x, pt.y, scale1)
      //   makeFlower(spec, a_t - spec.flower_spike_a0_rad,
      //               pt.x, pt.y, scale1)
      //   // makeTwig(spec, scale1,
      //   //   a_t*180/Math.PI + rand.nextInt(spec.branch_a0[0], spec.branch_a0[1]) * dir,
      //   //   pt.x, pt.y, lvl+1, max_level)
  
      //   dir *= -1
      // }
    }
  }
}

function makePlant(spec:PSpec, x:number, y:number)
{

  // let r1 = rand.nextInt(50, 400)
  // let r2 = rand.nextInt(50, 200)
  // let r3 = rand.nextInt(50, 100)

  // let max_a0 = rand.nextInt(20, 60)
  // let num_branch0 = rand.nextInt(1, 5)

  for (let i = 0; i < spec.num_stems; i++)
  {
    let a0 = rand.nextInt(-spec.stem_max_a0, spec.stem_max_a0+1)
    
    makeTwig(spec,
       .7 + rand.nextDouble() * .3, // Scale
        a0, x, y, 0, spec.branch_max_level)
  }

  if (spec.ground_leaf)
  {


    let angles = makeAngleList(rand, spec.ground_leaf_num)
    for (let i = 0; i < spec.ground_leaf_num; i++)
    {
      // Note could end up imbalanced, can be done better,
      // let z_angle = Math.PI * 2 * rand.nextDouble()
      // let z_angle = (i < 5)?
      //         (rand.nextDouble() * Math.PI/6 + rand.pick([0, Math.PI*5/6]))
      //         :(rand.nextDouble() * Math.PI/2 + Math.PI/4)
      let z_angle = DR(angles[i])

      // let a0 = rand.nextInt(-spec.stem_max_a0, spec.stem_max_a0+1)
      // let a0 = rand.nextInt(-70, 71)
      let cos_z = Math.cos(z_angle)
      let a0 =  cos_z * spec.ground_leaf_max_a0
      // let a0 = z_angle * 180 / Math.PI -90
      
      let scale = .8 + .2 * rand.nextDouble()
      // let w_scale = .2 + .8 * rand.nextDouble()
      let w_scale = .2 + .8 * Math.sin(z_angle)

      makeLeaf(spec, DR(a0), x, y, w_scale, cos_z)
      // TODO TODO TODO LEAF ANGLES
      // let [gl_spine, gl_shell] = makeShell(
      //   spec.leaf_r1 * scale,
      //   spec.leaf_r2 * scale,
      //   spec.leaf_r3 * scale,
      //   DR(a0),
      //   DR(a0 + rand.nextInt(-60, 60) * cos_z),
      //   DR(a0 + rand.nextInt(-60, 60) * cos_z),
      //   x, y, spec.leaf_w0*w_scale, spec.leaf_w1*w_scale, spec.leaf_w2*w_scale,
      //   false)

      // let gl_path = gl_shell.toPath()
      // gl_path.strokeColor = "black"
      // gl_path.strokeWidth = 1

      // // let g = new S.LinearGradient(spine.x4, spine.y1, spine.x1, spine.y4);// Swapped x looks better
      // // g.addStop(.3, "#010")
      // // g.addStop(1, hsbToRGB(.333, 1, rand.nextDouble() * .4 + .6).toHex())
      // // g.isUserSpace = true

      // // shell.fill = "green"//g
      // gl_path.fill = spec.leaf_color
      // r.add(gl_path)

      // if (w_scale > .2)
      // {
      //   // let [p1, p2] = spine.split(.1)
      //   // let [p3, p4] = p2.split(.7)
      //   let [p3, p4] = gl_spine.split(.7 + rand.nextDouble() * .2)

      //   let s1 = p3.toPath();

      //   s1.fill = "none"
      //   s1.strokeColor = "black"

      //   r.add(s1)
      // }
    }
  }
}

function makeBackground(W:number, H:number)
{
  let back_lg = new S.LinearGradient(0, 0, 0, 1)
  back_lg.addStop(0, "skyblue")
  back_lg.addStop(.5, "skyblue")
  back_lg.addStop(.68, "blue")
  back_lg.addStop(.7, "green")
  back_lg.addStop(.86, hsbToRGB(.3, 1, .2).toHex())
  back_lg.addStop(.96, hsbToRGB(.3, 1, .2).toHex())
  back_lg.addStop(1, "darkgreen")

  let bg = new S.Rect(0, 0, W, H)
  bg.fill = back_lg
  r.add(bg)

  let cloud_lg = new S.LinearGradient(0, 0, 0, 1)
  cloud_lg.addStop(0, "white")
  cloud_lg.addStop(.1 + rand.nextDouble() * .8, "lightgrey")// cloud shininess
  cloud_lg.addStop(1, "grey")

  let cl = new S.SVGGroup()

  let n_clouds = rand.nextInt(1, 10)
  let ylines = []
  for (let i = 0; i < rand.nextInt(1, 3); i++)
  {
    ylines.push(H * (.05 + rand.nextDouble() * .35))
  }
  if (rand.chance(.7))
  {
    let yscale = rand.pick([1, 1 + rand.nextDouble() * 2])
    for (let i = 0; i < n_clouds; i++)
    {
//      makeCloud(cl, cloud_lg, W*rand.nextDouble(), H * (.05 + rand.nextDouble() * .35), yscale)
      makeCloud(cl, cloud_lg, W*rand.nextDouble(), rand.pick(ylines), yscale)
    }
    // makeCloud(cl, cloud_lg, W*.7, H * .25)
    cl.filter = "blur_20"
  }
  else
  {
    for (let i = 0; i < n_clouds; i++)
    {
//      makeWispyWhiteCloud(cl, cloud_lg, W*rand.nextDouble(), H * (.05 + rand.nextDouble() * .35))
      makeWispyWhiteCloud(cl, cloud_lg, W*rand.nextDouble(), rand.pick(ylines))
    }
  }
  r.add(cl)
}

function makeCloud(cl:S.SVGGroup, cloud_lg: S.LinearGradient, x:number, y:number, yscale:number)
{
  // NOTE: Makes cloud to above and right. Maybe center this.
  let cw = 200
  let n = 20
  let dx = cw/n
  for (let i = 0; i < n; i++) // Baseline
  {
    let c = new S.Ellipse(x + i * dx + rand.nextDouble() * 35,
       y + rand.nextDouble() * 15,
       25 + rand.nextDouble() * 50, 5 * yscale + rand.nextDouble() * 5 * yscale)

    c.fill = cloud_lg
    cl.add(c)
  }

  n = 30
  dx = cw * .7 / n
  for (let i = 0; i < 30; i++) // Details above
  {
    let c = new S.Ellipse(x + cw * .1 + i * dx + rand.nextDouble() * 35,
       y + -35 * yscale/2 + rand.nextDouble() * 45 * yscale/2,
       5 + rand.nextDouble() * 50, 5 + rand.nextDouble() * 20 * yscale)

    c.fill = cloud_lg
    cl.add(c)
  }
}

function makeWispyWhiteCloud(cl:S.SVGGroup, cloud_lg: S.LinearGradient, x:number, y:number)
{
  
  for (let i = 0; i < 20; i++)
  {
    let c = new S.Ellipse(x + i * 10 + rand.nextDouble() * 35,
       y + rand.nextDouble() * 15,
       25 + rand.nextDouble() * 50, 5 + rand.nextDouble() * 5)

    c.fill = "url(#white_cloud)"
    cl.add(c)
  }
}


class DrawQ {
  public constructor(public mainCtx:CanvasRenderingContext2D, 
                      public totalCount:number)
  {

  }
  images:HTMLImageElement[] = []
  done:boolean[] = []
  static readonly DOMURL = window.URL || window["webkitURL"] || window;
  progress:HTMLElement = document.getElementById("progress")
  drawOnCanvas(svgdata)
  {
    
    // var canvas = <HTMLCanvasElement>document.getElementById('canvas2');
    // var ctx = canvas.getContext('2d');
    // ctx.imageSmoothingEnabled = true;
    
    

    var img = new Image();
    var svg = new Blob([svgdata], {type: 'image/svg+xml'});
    var url = DrawQ.DOMURL.createObjectURL(svg);

    let idx = this.images.push(img) - 1
    var loader = this
    img.onload = function() {
      loader.imgOnLoad(idx)
      // ctx.drawImage(img, 0, 0);
      // DrawQ.DOMURL.revokeObjectURL(url);
    }

    img.src = url;

  }

  loadCalls = 0
  imgOnLoad(myidx:number)
  {
    this.loadCalls++
    console.log("Call "+myidx+" ("+this.loadCalls+"/"+this.totalCount+")")
    // Find all previous undone work.
    var i
    for (i = myidx - 1; i >= 0; i--)
    {
      if (this.done[i])
        break
    }
    let lastDone = i
    this.mainCtx.imageSmoothingEnabled = true
    for (i = lastDone + 1; /*i <= myidx*/; i++)
    {
      if (!this.images[i] || !this.images[i].complete)// Image that should be rendered before not yet ready
      {
        // console.log("Call for "+myidx+", stopped at "+i)
        return
      }

      // Draw all previous images (MAYBE including current) if
      // 1. Every previous image is done (maybe during this invocation)
      // 2. No null image before this that is not done.
      console.log("Draw "+i)
      this.mainCtx.drawImage(this.images[i], 0, 0);

      DrawQ.DOMURL.revokeObjectURL(this.images[i].src);

      this.images[i] = null
      this.done[i] = true

      this.progress.innerText = "Progress: "+(i-1)+"/"+this.totalCount
      if (i == this.totalCount) this.progress.classList.add("complete")
    }

  }
}

let rand = new RNG()
let r:S.SVGRoot = null
let GLOBAL_FAST = true
function main(W:number, H:number, smooth:boolean)
{
  // const GLOBAL_FAST = true
  GLOBAL_FAST = !smooth

  //const W = 1024, H = 600;

  var mainCanvas = <HTMLCanvasElement>document.getElementById('canvas2');
  mainCanvas.width = W
  mainCanvas.height = H
  var mainCtx = mainCanvas.getContext('2d');

  // Currently filters must be manually placed.
  let defs = `<defs>
  <filter id="f1" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${H/160}" />
  </filter>
  <filter id="blur_2" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${H/320}" />
  </filter>
  <filter id="blur_20" x="-20%" y="-20%" width="140%" height="170%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="${H/100}" />
  </filter>
    <radialGradient id="white_cloud"
      cx="50%" cy="50%" r="50%" >
      <stop offset="0%" stop-color="white" />
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>`

  r = new S.SVGRoot(W, H)

  r.defExtra = defs
  S.SVGReset()

  makeBackground(W, H)
  // console.log(r.toSVG())
  // drawAppend(r.toSVG())
  let plantCountScale = (W/H * 2/3)
    let N1 = Math.floor(rand.nextInt(7, 12) * plantCountScale) || 1,
       N2 = Math.floor(rand.nextInt(15, 23) * plantCountScale) || 1
  let dq = new DrawQ(mainCtx, N1+N2)

  dq.drawOnCanvas(r.toSVG())

  if (rand.chance(.5))
  {
    let spec = new PSpec(rand, H*(.75 + rand.nextDouble() * .25));
    let n = N1
    let dx = W/n
    let arr = [...Array(n).keys()]
    rand.shuffle(arr)
    for (let i = 0; i < n; i++)
    {
      let pos = arr[i]
      r.children = []
      
      makePlant(spec, pos * dx + (1 + rand.nextDouble()) * dx/2, H*.85 + (i/n) * H * .1)

      let svgml = r.toSVG()
      dq.drawOnCanvas(svgml)
    }
    // main(spec, 2*W/3, H * .75)

    spec = new PSpec(rand, H*(.3 + rand.nextDouble() * .4));
    n = N2
    dx = W/n
    arr = [...Array(n).keys()]
    rand.shuffle(arr)
    for (let i = 0; i < n; i++)
    {
      let pos = arr[i]
      r.children = []
      makePlant(spec, pos * dx + (1 + rand.nextDouble()) * dx/2, H*.9  + (i/n) * H * .1)
      let svgml = r.toSVG()
      dq.drawOnCanvas(svgml)
    }
  }
  else
  {
    // let n = N1
    let dx = W/N1
    let arr = [...Array(N1).keys()]
    rand.shuffle(arr)
    var spec 
    for (let i = 0; i < N1; i++)
    {
      let pos = arr[i]
      if (i % 3 == 0)
        spec = new PSpec(rand, H*(.75 + rand.nextDouble() * .25));
      r.children = []
      makePlant(spec, pos * dx + (1 + rand.nextDouble()) * dx/2, H*.85 + (i/N1) * H * .1)
      dq.drawOnCanvas(r.toSVG())
    }
    // main(spec, 2*W/3, H * .75)

    // n = N2
    dx = W/N2
    arr = [...Array(N2).keys()]
    rand.shuffle(arr)
    for (let i = 0; i < N2; i++)
    {
      let pos = arr[i]
      if (i % 2 == 0)
        spec = new PSpec(rand, H*(.3 + rand.nextDouble() * .4));
      r.children = []
      makePlant(spec, pos * dx + (1 + rand.nextDouble()) * dx/2, H*.9  + (i/N2) * H * .1)
      dq.drawOnCanvas(r.toSVG())
    }
    
  }

  // Bottom grass
  {
    let grassCol = hsbToRGB(.3, 1, .25).toHex()
    r.children = []
    let GN = 180
    let gw = W * 1./ GN
    let gl = H * .005
    for (let i = 0; i < GN; i++)
    {
      let [sp, sh] = makeShell(
        // gl, gl, gl,
        gl * rand.range(1, 8),
        gl * rand.range(1, 8),
        gl * rand.range(1, 8),
        0,
        rand.nextDouble() * PI/6 * rand.pick([1, -1]),
        rand.nextDouble() * PI/6 * rand.pick([1, -1]),
        gw * i, H, gw* 1.2, gw*.6, gw * .5, false)
      let shs = sh.toPath()
      // shs.fill = hsbToRGB(.3, 1, rand.range(.1, .2)).toHex()
      shs.fill = grassCol
      // shs.strokeColor = "black"

      r.add(shs)

    }
    r.opacity = .7
    // r.filter = "blur_2"
    dq.drawOnCanvas(r.toSVG())
  }
}

main(1200, 800, false)
window["make_all_flowers"] = main
