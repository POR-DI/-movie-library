import '@flaticon/flaticon-uicons/css/regular/rounded.css'
const names = {
  home: 'home',
  search: 'search',
  shelf: 'books',
  arrow: 'arrow-right',
  plus: 'plus',
  check: 'check',
  heart: 'heart',
  bookmark: 'bookmark',
  star: 'star',
  share: 'share',
  film: 'film',
  user: 'user',
  close: 'cross',
  play: 'play',
}
export default function Icon({ name, size = 20 }) {
  return (
    <i
      className={'ui-icon fi fi-rr-' + (names[name] || 'film')}
      aria-hidden="true"
      style={{ fontSize: size, width: size, height: size }}
    />
  )
}
