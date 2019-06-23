import { h, render ,Component} from './min-react';

// // 告诉 Babel 将 JSX 转化成 h() 的函数调用:
// /** @jsx h */

// const App = () => <div>Hello Jike, World A11pp</div>

  // h('div', {class: 'app'}, h('div', {}, '22'), h())
class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      list: ['1你急', '3红红火火', '2很好']
    }
  }
  listChange(){
    this.setState({
      list: ['2很好', '55555', '3红红火火', 'uuuiuu']
    }, () => {
        console.log('callback')
    })
  }
  render() {
    return (
      <div class="list">    
        {
          this.state.list.map(item => {
            return (
              <h2 key={item}>{item}</h2>
            )
          })
        }
        <button onClick={this.listChange.bind(this)}>change</button>
      </div>
    )
  }
}

render(
  <App></App>,
  document.getElementById('app')
)