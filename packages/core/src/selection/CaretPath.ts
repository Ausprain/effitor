/**
 * 光标路径, 用于指示如何从编辑区根节点(et-body)"走到"目标光标位置
 *
 * 这是对实现协同编辑时, 确定光标位置的方案的构想; 对于 Range, 则使用两个一前一后的CaretPath
 *
 * @example
 * <et-body>
 *  <p>A1A<b>BB2B<i>CCC3C</i></b></p>
 *  <p>4</p>
 *  <p id="p3">CC5<i>DD</i>6<br></p>
 * <et-body>
 * 上述DOM片段中的数字仅代表光标位置, 则
 * 1: {
 *    // et-body -> p -> A|A
 *    path: '0,0,1'  // body.childNodes[0].childNodes[0]节点的 1 位置, 即"AA"的 1 位置
 * }
 * 2: {
 *    // et-body -> p -> b -> BB|B
 *    path: '0,1,1,2'  // body.childNodes[0].childNodes[1].childNodes[1]节点的 2 位置, 即"BBB"的 2 位置
 * }
 * 3: {
 *    // et-body -> p -> b -> c -> CCC|C
 *    path: '0,1,1,1,3'
 * }
 * 4: {
 *    // et-body -> p -> 0
 *    path: '1,0'
 * }
 * 5: {
 *    // et-body -> p#p3 -> CC|
 *    id: 'p3'
 *    path: '0,2'  // p#p3.childNodes[0]节点的 2 位置
 * }
 * 6: {
 *    // et-body -> p#p3 -> 2
 *    id: 'p3',
 *    path: '2'   // p#p3.childNodes[2]节点的外开头位置, 该节点不存在, 则为 p#p3的内末尾位置
 * }
 */
