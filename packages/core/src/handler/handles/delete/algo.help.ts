/* eslint-disable @typescript-eslint/no-unused-vars */
/**

range remove algorithm

1. remove in same paragraph
case: <p>aa bb cc dd</p>
range1: start/endContainer are both p
  <p>aa ^bb cc| dd</p>
range2: has partial selected
  <p>aa b^b c|c dd</p>
solve:
  -> remove: bb's outer to cc's outer under p
  -> insert: unselected (b merge c)
    -> if insert empty: check merge aa and dd
resule:
  -> range1: <p>aa dd</p>
  -> range2: <p>aa b|c dd</p>
algo:
  1. if `start/endContainer` are both p,
    1.1. let `startNode` is node at startOffset, `endNode` is node at endOffset,
        `startPrev` is `startNode`'s prev sibling, `endNext` is `endNode`'s next sibling.
    1.2. if need merge `startPrev` and `endNext`
        1.2.1. remove from `startNode` to `endNode`
        1.2.2. clone and merge `startNode` and `endNode` to `mergedF`
    1.3. else, remove from `startNode` to `endNode`
    1.4. if has `mergedF`, insert it into where `startPrev` at
    1.5. return
  2. get `startOuter`, `endOuter`, `startPrev`, `endNext`
  3. clone to `startUnselected`, `endUnselected`
  4. merge `startUnselected` and `endUnselected` to `mergedF`
  5. remove from `startOuter` to `endOuter`
  6. if `mergedF` is not empty:
    6.1. insert `mergedF` after `startPrev`
    6.2. return
  7. else, check need merge `startPrev` with `endNext` ?
    7.1. if needed, remove `startPrev` and `endNext`, clone and merge to insert into where `startPrev` at
    7.2. else, just caret to `startPrev`s end
  8. return
impl:
  {@link removeInSameParagraph }
  {@link removeNodesAndChildlessAncestorAndMergeSiblings }
  {@link expandRemoveInsert }

2. remove in different paragraph with same parent
case: equal paragraph
  <p1>aa bb cc</p1>
  <p2>dd ee ff</p2>
range1: range end to p2's end
  <p1>aa b^b cc</p1><p2>dd ee ff|</p2>
range2: range start to p1's start
  <p1>^aa bb cc</p1><p2>dd ee ff|</p2>
range3:
  <p1>aa b^b cc</p1><p2>dd e|e ff</p2>
solve:
  -> remove:
    start's outer under p1 to p1's end
    if range end to p2's end: remove p2
    else: remove from p2's start to end's outer under p2
  -> insert: clone unselected to p1
  -> move: the rest of p2 to p1's end
result:
  -> range1: <p1>aa b|</p1>
  -> range2: <p1>|</p1>
  -> range3: <p1>aa b|e ff</p1>
algo:
  1. get `startOuter`, `endOuter`, `startPrev`, `endNext`
    1.1 let `nextRest`
  2. clone to `startUnselected`, `endUnselected`
  3. merge `startUnselected` and `endUnselected` to `mergedF`
  4. remove from `startOuter` to p1's end
  5. check p2 has rest
    5.1. if `endNext` is null, remove p2
    5.2. else remove from p2's start to `endOuter`,
        and record the rest siblings after `endOuter` to `nextRest`
  6. if `mergedF` is not empty:
    6.1. insert `mergedF` after `startPrev`
    6.2. move nodes in `nextRest` into p1 after `mergedF`
  7. else, check need merge `startPrev` with `endNext` ?
    7.1. if needed, remove `startPrev` and `endNext`, clone and merge to insert into where `startPrev` at
  8. move nodes in `nextRest` into p1's end
  9. return

case2: not equal paragraph
  <p>aa b^b cc</p>
  <bq>dd e|e ff</bq>
solve:
  -> remove:
    start's outer under p to p's end
    if range end to bq's end: remove bq
    else: remove from bq's start to end's outer under bq
  -> insert:
    clone unselected of start's outer into p's end
    clone unselected of end's outer into bq's start if bq is not removed
result:
  <p>aa b|</p>
  <bq>e ff</bq>
algo:
  1. get `startOuter`, `endOuter`, `endNext`
  2. clone to `startUnselected`, `endUnselected`
  3. remove from `startOuter` to p's end
  4. check bq has rest
      4.1. if `endNext` is null and `endUnselected` is empty, remove bq
      4.2. else remove from bq's start to `endOuter`,
  5. insert `startUnselected` to p's end
  6. insert `endUnselected` to bq's start if bq still exist

impl:

3. remove in different paragraph with different parent but same top element.
case:
  <bq>  // topEl, commonAncestor
    <ul>  // startOuter
      <li>aa b^b cc</li>  // startP
      <li>AA BB CC</li>
    </ul>
    <p>dd ee ff</p>
    <p>DD E|E FF</p>  // endP, endOuter
    <p>XX YY ZZ</p>
  </bq>

  <bq>  // topEl, commonAncestor
    <p>dd ee ff</p>
    <p>DD E^E FF</p>  // startP, startOuter
    <ul>
      <li>aa bb cc</li>
      <li>AA B|B CC</li>  // endP, endOuter
      <li>XX YY ZZ</li>
    </ul>
  </bq>

  <bq>
    <ul>
      <li>aa bb cc</li>
      <li>AA BB CC</li>
    </ul>
    <ul>
      <li>dd ee ff</li>
      <li>DD EE FF</li>
    </ul>
  </bq>

  <bq>  // topEl, commonAncestor
    <ul>  // startOuter
      <li>11 22 33</li>
      <ul>
        <li>aa b^b cc</li>  // startP
        <li>AA BB CC</li>
      </ul>
      <li>44 55 66</li>
    </ul>
    <ul>  // endOuter
      <li>11 22 33</li>
      <ul>  // endPartial at the algo's end (算法结束时 endPartial 所指节点)
        <li>xx y|y zz</li>   // endP
        <li>XX YY ZZ</li>
      </ul>
      <li>77 88 99</li>
    </ul>
  </bq>

algo:
  ( all remove action should be delayed, i.e. all cmds should be exec at the end. )
  1. get startP, endP, commonAncestor,
      let startOuter be a child of commonAncestor at the range's start edge, which must be contained or partially contained.
      let endOuter be a child of commonAncestor at the range's end edge, which must be contained or partially contained.
      let startPartial be a child of startP at the range's start edge, which must be contained or partially contained.
      let endPartial be a child of endP at the range's start edge, which must be contained or partially contained.
      let startNext be startPartial's nextSibling,
      let startPrev be startPartial's prevSibling.
      let endPrev be endPartial's prevSibling,
      let endNext be endPartial's nextSibling.
  2. remove nodes between startOuter and endOuter (not inclusive both)
  3. clone unselected of startPartial to startUnselectedDf
  4. remove nodes from startPartial to startP's end
  5. if startP is not startOuter
    5.1. let startPartial be startP's parentNode, startNext be startP's nextSibling
    5.2. while startPartial
      5.2.1. remove nodes from startNext to startPartial's lastChild
      5.2.2. if startPartial is startOuter,
          if startNext is not null, let startPartial be startNext's prevSibling
          else let startPartial be it's lastChild
          (i.e. the previous value it would be and is a child of startOuter),
          break
      5.2.3. let startNext be startPartial's nextSibling, startPartial be it's parentNode
  6. clone unselected of endPartial to endUnselectedDf
  7. if endUnselectedDf is empty, let isEndOuterRemoved be false
    8.1. while endNext is null,
      8.1.1. if endPartial is endOuter, let isEndOuterRemoved be true, break
      8.1.2. let endPartial be it's parent,
      8.1.3. let endNext be endPartial's nextSibling
    8.2. if isEndOuterRemoved
      8.2.1. remove endPartial
      8.2.2. insert startUnselectedDf into startP's end
      8.2.3. return
  8. remove nodes from endPartial's parentNode's firstChild to endPartial
  9. let endPartial be it's parentNode,
  10. if endPartial is not endOuter
    10.1. let endPrev be endPartial's prevSibling, endPartial be it's parentNode
    10.2. while endPartial
      10.2.1. remove nodes from endPartial's firstChild to endPrev
      10.2.2. if endPartial is endOuter,
          if endPrev is not null, let endPartial be endPrev's nextSibling
          else let endPartial be it's firstChild
          (i.e. the previous value it would be and is a child of endOuter),
          break
      10.2.3. let endPrev be endPartial's prevSibling, endPartial be it's parentNode
  11. if startOuter not equal to endOuter
    11.1. insert startUnselectedDf into startP's end
    11.2. insert endUnselectedDf into endP's start
    11.3. return
  12. if startP is equal to endP, remove endP
    12.1. merge startUnselectedDf and endUnselectedDf to mergedF
    12.2. if mergedF is not empty
      12.2.1. insert into startP's end
    12.3. else if startPrev and endNext can merge
      12.3.1. remove startPrev and endNext
      12.3.2. clone and merge and insert into startP's end
      12.3.3. let endNext be it's nextSibling
    12.4. move nodes from endNext to endP's lastChild into startP's end
  13. else
    13.1. insert startUnselectedDf into startP's end
    13.2. insert endUnselectedDf into endP's start
  14. if endOuter isn't endP and startOuter isn't startP, merge endOuter to startOuter
    14.1. remove endOuter
    14.2. if endPartial is endP, let endPartial be endP's nextSibling
    14.3. move nodes from endPartial to endOuter's lastChild into where after startPartial
  15. return

impl:
  {@link removeSpanningParagraphs }

3.1 if use the algo above to solve 1. or 2. or 4. ?
  1. same paragraph, not adaptable.
      this algo is use to solve the cases that don't want to remove paragraph,
      in same paragraph, it would never remove the paragraph.
  2. different paragraph in same parent, adaptable in all cases.
    <et-body>  // commonAncestor
      <p1>aa b^b cc</p1>  // startTop, startP, startOuter
      <p2>XX YY ZZ</p2>
      <p3>dd e|e ff</p3>  // endTop, endP, endOuter
    </et-body>
  4. different paragraph in different top element, adaptable in all cases.

4. remove in different paragraph and different top element.
case:
  <et-body>  // commonAncestor
    <ul>  // startOuter, startTop
      <li>11 22 33</li>
      <ul>
        <li>aa b^b cc</li>  // startP
        <li>AA BB CC</li>
      </ul>
      <li>44 55 66</li>
    </ul>
    <ul>  // endOuter, endTop
      <li>11 22 33</li>
      <ul>
        <li>xx y|y zz</li>   // endP
        <li>XX YY ZZ</li>
      </ul>
      <li>77 88 99</li>
    </ul>
  </et-body>

*/

import {
  expandRemoveInsert,
  removeNodesAndChildlessAncestorAndMergeSiblings,
} from './delete.shared'
import { removeInSameParagraph, removeSpanningParagraphs } from './deleteAtRange'
