const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = innerWidth;
canvas.height = innerHeight;

const mouse = {
  x: innerWidth,
  y: innerHeight
}

const colors = ['#ff0000', '#00ff00', '#ffffff', '#ff00ff', '#ffa500', '#ffff00', '#00ff00', '#ffffff', '#ff00ff']

addEventListener('resize', () => {
  canvas.width = innerWidth
  canvas.height = innerHeight
})

const gravity = 0.06
const friction = 0.999

class Particle {
  constructor(x, y, radius, color, velocity) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = {
      x: velocity.x,
      y: velocity.y
    }
    this.opacity = .9
  }

  draw() {
    c.save()
    c.globalAlpha = this.opacity
    c.beginPath()
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    c.fillStyle = this.color
    c.fill()
    c.closePath()
    c.restore()
  }

  update() {
    this.draw()
    this.velocity.x *= friction
    this.velocity.y *= friction
    this.velocity.y += gravity
    this.x += this.velocity.x
    this.y += this.velocity.y
    this.opacity -= .003
  }
}

addEventListener('click', (event) => {
  mouse.x = event.clientX
  mouse.y = event.clientY

  const particleCount = 450
  const power = 14
  let radians = (Math.PI * 2) / particleCount

  for (let i = 0; i < particleCount; i++) {
    particles.push(
      new Particle(
        mouse.x,
        mouse.y,
        3,
        `hsl(${Math.random() * 360}, 50%, 50%)`,
        {
          x: Math.cos(radians * i) * (Math.random() * power),
          y: Math.sin(radians * i) * (Math.random() * power)
        }
      )
    )
  }
})

let particles
particles = []

function animate() {
  requestAnimationFrame(animate)
  c.fillStyle = 'rgba(1,1,1,.10)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  particles.forEach((particle, i) => {
    if (particle.opacity > 0) {
      particle.update()
    } else {
      particles.splice(i, 1)
    }
  })
}

animate()