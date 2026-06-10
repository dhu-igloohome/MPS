/** Standard contract clauses (sections II–X) for Create Contract remark field. */
export const CONTRACT_REMARK_TEMPLATE_1 = `一、产品质量标准和验收方法：按图纸和产品检验方法验收。
二、交货地点：伊格鲁指定仓库。
三、包装要求：原厂包装，包将袋上须写明名称，规格，数量之类的标签。
四、违约责任：
1.如乙方因交货延误且未及时通知甲方,给甲方生产造成影响的，乙方每日支付总金额的1% 罚金给甲方，但总罚金不超过总货款30%。
2.乙方对所供产品的任何工艺及参数的更改,必须事前通知甲方，如乙方在未通知甲方情况下， 给甲方造成的损失必须进行赔偿,且甲方保留诉讼权利。
3.如乙方提供给甲方的产品不合格或以次充优，甲方有权对乙方进行全额罚款,造成损失的，乙方必须对甲方的损失进行赔偿,且甲方保留诉讼权利。
五、如遇不可抗力(地震，水灾，战争等)造成乙方不能按期交货，乙方应事发后7天内通知甲方，协商交货期。
六、合同一经签订，双方保证格守信用，如确需变更或解除，必须在三日内通知对方双方依法另立协议。
七、合同纠纷解决方式： 因本合同引起的任何争议或纠纷，应通过友好协商解决，如协商不能解决，应提交 合同签订所在地法院通过诉讼解决。
八、合同自双方签字并加盖有效章之日起生效，传真件具有原件相同的法律效率。
九、本合同一式两份，供需双方各执一份，具有相同的法律效率，有效期一年。`;

export type ContractRemarkTemplateId = "template1";

export const CONTRACT_REMARK_TEMPLATES: Record<ContractRemarkTemplateId, string> = {
  template1: CONTRACT_REMARK_TEMPLATE_1,
};
