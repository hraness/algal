// Lean compiler output
// Module: Algal.Core.DecimalSyntax
// Imports: public import Init public meta import Init public import Algal.Core.BinaryValue public import Init.Data.Nat.ToString public import Init.Data.Rat.Lemmas public import Init.Omega
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* lean_uint32_to_nat(uint32_t);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
uint8_t l_List_instDecidableEqNil___redArg(lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
lean_object* lean_nat_pow(lean_object*, lean_object*);
lean_object* lean_nat_mul(lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
lean_object* lean_nat_to_int(lean_object*);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
lean_object* lean_int_neg(lean_object*);
uint8_t lean_uint32_dec_eq(uint32_t, uint32_t);
lean_object* lean_int_sub(lean_object*, lean_object*);
lean_object* l_instDecidableEqFin___boxed(lean_object*, lean_object*, lean_object*);
uint8_t l_instDecidableEqList___redArg(lean_object*, lean_object*, lean_object*);
uint8_t l_Option_instDecidableEq___redArg(lean_object*, lean_object*, lean_object*);
lean_object* l_Nat_cast___at___00Dyadic_toRat_spec__0(lean_object*);
lean_object* l_List_reverse___redArg(lean_object*);
uint32_t l_Nat_digitChar(lean_object*);
lean_object* l_Rat_ofInt(lean_object*);
lean_object* l_Rat_zpow(lean_object*, lean_object*);
lean_object* l_Rat_mul(lean_object*, lean_object*);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
LEAN_EXPORT uint32_t lp_algalVerification_Algal_Core_DecimalSyntax_digitChar(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_digitChar___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readDigit(uint32_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readDigit___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_takeDigits(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__5_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__5_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__1_splitter(lean_object*, lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*1, .m_other = 0, .m_tag = 245}, .m_fun = (void*)l_instDecidableEqFin___boxed, .m_arity = 3, .m_num_fixed = 1, .m_objs = {((lean_object*)(((size_t)(10) << 1) | 1))} };
static const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq___closed__0_value;
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_Digits_list(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_DecimalSyntax_Digits_chars_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_Digits_chars(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readDigits(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readInteger(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorIdx(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorIdx___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim(lean_object*, lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim___redArg___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim(lean_object*, uint8_t, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ofNat(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ofNat___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentSign(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentSign___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars(uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___boxed(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentPart_chars(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readExponentSign(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readExponentTail(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readExponentTail___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readExponent(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars___boxed__const__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_exponentChars(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readFraction(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral_decEq(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral_decEq___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_renderUnsigned(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_render(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readUnsigned(uint8_t, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readUnsigned___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readPrefix(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readWhole(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readExponentSign_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readExponentSign_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_exponentChars_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_exponentChars_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readExponent_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readExponent_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readFraction_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readFraction_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_fractionChars_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_fractionChars_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Option_bind_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Option_bind_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readPrefix_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readPrefix_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_fractionDigits(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_coefficient(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_power(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_signedCoefficient(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_DecimalSyntax_denote___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_denote___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_denote(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readDigits_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readDigits_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_DecimalSyntax_oneDigits___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*2 + 0, .m_other = 2, .m_tag = 0}, .m_objs = {((lean_object*)(((size_t)(1) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_oneDigits___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_oneDigits___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_oneDigits = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_oneDigits___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_zeroInteger = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_DecimalSyntax_tenth___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_oneDigits___closed__0_value)}};
static const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_tenth___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_tenth___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_DecimalSyntax_tenth___closed__1_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 8, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits___closed__0_value),((lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_tenth___closed__0_value),((lean_object*)(((size_t)(0) << 1) | 1)),LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_tenth___closed__1 = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_tenth___closed__1_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_tenth = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_tenth___closed__1_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_DecimalSyntax_negativeZero___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 8, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits___closed__0_value),((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),LEAN_SCALAR_PTR_LITERAL(1, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_negativeZero___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_negativeZero___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_negativeZero = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_negativeZero___closed__0_value;
static const lean_ctor_object lp_algalVerification_Algal_Core_DecimalSyntax_positiveZero___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*3 + 8, .m_other = 3, .m_tag = 0}, .m_objs = {((lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_zeroDigits___closed__0_value),((lean_object*)(((size_t)(0) << 1) | 1)),((lean_object*)(((size_t)(0) << 1) | 1)),LEAN_SCALAR_PTR_LITERAL(0, 0, 0, 0, 0, 0, 0, 0)}};
static const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_positiveZero___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_positiveZero___closed__0_value;
LEAN_EXPORT const lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_positiveZero = (const lean_object*)&lp_algalVerification_Algal_Core_DecimalSyntax_positiveZero___closed__0_value;
LEAN_EXPORT uint32_t lp_algalVerification_Algal_Core_DecimalSyntax_digitChar(lean_object* v_d_1_){
_start:
{
uint32_t v___x_2_; 
v___x_2_ = l_Nat_digitChar(v_d_1_);
return v___x_2_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_digitChar___boxed(lean_object* v_d_3_){
_start:
{
uint32_t v_res_4_; lean_object* v_r_5_; 
v_res_4_ = lp_algalVerification_Algal_Core_DecimalSyntax_digitChar(v_d_3_);
lean_dec(v_d_3_);
v_r_5_ = lean_box_uint32(v_res_4_);
return v_r_5_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readDigit(uint32_t v_c_6_){
_start:
{
lean_object* v___x_7_; lean_object* v___x_8_; uint8_t v___x_9_; 
v___x_7_ = lean_unsigned_to_nat(48u);
v___x_8_ = lean_uint32_to_nat(v_c_6_);
v___x_9_ = lean_nat_dec_le(v___x_7_, v___x_8_);
if (v___x_9_ == 0)
{
lean_object* v___x_10_; 
lean_dec(v___x_8_);
v___x_10_ = lean_box(0);
return v___x_10_;
}
else
{
lean_object* v___x_11_; uint8_t v___x_12_; 
v___x_11_ = lean_unsigned_to_nat(57u);
v___x_12_ = lean_nat_dec_le(v___x_8_, v___x_11_);
if (v___x_12_ == 0)
{
lean_object* v___x_13_; 
lean_dec(v___x_8_);
v___x_13_ = lean_box(0);
return v___x_13_;
}
else
{
lean_object* v___x_14_; lean_object* v___x_15_; 
v___x_14_ = lean_nat_sub(v___x_8_, v___x_7_);
lean_dec(v___x_8_);
v___x_15_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_15_, 0, v___x_14_);
return v___x_15_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readDigit___boxed(lean_object* v_c_16_){
_start:
{
uint32_t v_c_boxed_17_; lean_object* v_res_18_; 
v_c_boxed_17_ = lean_unbox_uint32(v_c_16_);
lean_dec(v_c_16_);
v_res_18_ = lp_algalVerification_Algal_Core_DecimalSyntax_readDigit(v_c_boxed_17_);
return v_res_18_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_takeDigits(lean_object* v_x_19_){
_start:
{
if (lean_obj_tag(v_x_19_) == 0)
{
lean_object* v___x_20_; lean_object* v___x_21_; 
v___x_20_ = lean_box(0);
v___x_21_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_21_, 0, v___x_20_);
lean_ctor_set(v___x_21_, 1, v_x_19_);
return v___x_21_;
}
else
{
lean_object* v_head_22_; lean_object* v_tail_23_; uint32_t v___x_24_; lean_object* v___x_25_; 
v_head_22_ = lean_ctor_get(v_x_19_, 0);
v_tail_23_ = lean_ctor_get(v_x_19_, 1);
v___x_24_ = lean_unbox_uint32(v_head_22_);
v___x_25_ = lp_algalVerification_Algal_Core_DecimalSyntax_readDigit(v___x_24_);
if (lean_obj_tag(v___x_25_) == 0)
{
lean_object* v___x_26_; lean_object* v___x_27_; 
v___x_26_ = lean_box(0);
v___x_27_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_27_, 0, v___x_26_);
lean_ctor_set(v___x_27_, 1, v_x_19_);
return v___x_27_;
}
else
{
lean_object* v___x_29_; uint8_t v_isShared_30_; uint8_t v_isSharedCheck_45_; 
lean_inc(v_tail_23_);
v_isSharedCheck_45_ = !lean_is_exclusive(v_x_19_);
if (v_isSharedCheck_45_ == 0)
{
lean_object* v_unused_46_; lean_object* v_unused_47_; 
v_unused_46_ = lean_ctor_get(v_x_19_, 1);
lean_dec(v_unused_46_);
v_unused_47_ = lean_ctor_get(v_x_19_, 0);
lean_dec(v_unused_47_);
v___x_29_ = v_x_19_;
v_isShared_30_ = v_isSharedCheck_45_;
goto v_resetjp_28_;
}
else
{
lean_dec(v_x_19_);
v___x_29_ = lean_box(0);
v_isShared_30_ = v_isSharedCheck_45_;
goto v_resetjp_28_;
}
v_resetjp_28_:
{
lean_object* v_val_31_; lean_object* v___x_32_; lean_object* v_fst_33_; lean_object* v_snd_34_; lean_object* v___x_36_; uint8_t v_isShared_37_; uint8_t v_isSharedCheck_44_; 
v_val_31_ = lean_ctor_get(v___x_25_, 0);
lean_inc(v_val_31_);
lean_dec_ref_known(v___x_25_, 1);
v___x_32_ = lp_algalVerification_Algal_Core_DecimalSyntax_takeDigits(v_tail_23_);
v_fst_33_ = lean_ctor_get(v___x_32_, 0);
v_snd_34_ = lean_ctor_get(v___x_32_, 1);
v_isSharedCheck_44_ = !lean_is_exclusive(v___x_32_);
if (v_isSharedCheck_44_ == 0)
{
v___x_36_ = v___x_32_;
v_isShared_37_ = v_isSharedCheck_44_;
goto v_resetjp_35_;
}
else
{
lean_inc(v_snd_34_);
lean_inc(v_fst_33_);
lean_dec(v___x_32_);
v___x_36_ = lean_box(0);
v_isShared_37_ = v_isSharedCheck_44_;
goto v_resetjp_35_;
}
v_resetjp_35_:
{
lean_object* v___x_39_; 
if (v_isShared_30_ == 0)
{
lean_ctor_set(v___x_29_, 1, v_fst_33_);
lean_ctor_set(v___x_29_, 0, v_val_31_);
v___x_39_ = v___x_29_;
goto v_reusejp_38_;
}
else
{
lean_object* v_reuseFailAlloc_43_; 
v_reuseFailAlloc_43_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_43_, 0, v_val_31_);
lean_ctor_set(v_reuseFailAlloc_43_, 1, v_fst_33_);
v___x_39_ = v_reuseFailAlloc_43_;
goto v_reusejp_38_;
}
v_reusejp_38_:
{
lean_object* v___x_41_; 
if (v_isShared_37_ == 0)
{
lean_ctor_set(v___x_36_, 0, v___x_39_);
v___x_41_ = v___x_36_;
goto v_reusejp_40_;
}
else
{
lean_object* v_reuseFailAlloc_42_; 
v_reuseFailAlloc_42_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_42_, 0, v___x_39_);
lean_ctor_set(v_reuseFailAlloc_42_, 1, v_snd_34_);
v___x_41_ = v_reuseFailAlloc_42_;
goto v_reusejp_40_;
}
v_reusejp_40_:
{
return v___x_41_;
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__5_splitter___redArg(lean_object* v_x_48_, lean_object* v_h__1_49_, lean_object* v_h__2_50_){
_start:
{
if (lean_obj_tag(v_x_48_) == 0)
{
lean_object* v___x_51_; lean_object* v___x_52_; 
lean_dec(v_h__2_50_);
v___x_51_ = lean_box(0);
v___x_52_ = lean_apply_1(v_h__1_49_, v___x_51_);
return v___x_52_;
}
else
{
lean_object* v_head_53_; lean_object* v_tail_54_; lean_object* v___x_55_; 
lean_dec(v_h__1_49_);
v_head_53_ = lean_ctor_get(v_x_48_, 0);
lean_inc(v_head_53_);
v_tail_54_ = lean_ctor_get(v_x_48_, 1);
lean_inc(v_tail_54_);
lean_dec_ref_known(v_x_48_, 2);
v___x_55_ = lean_apply_2(v_h__2_50_, v_head_53_, v_tail_54_);
return v___x_55_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__5_splitter(lean_object* v_motive_56_, lean_object* v_x_57_, lean_object* v_h__1_58_, lean_object* v_h__2_59_){
_start:
{
if (lean_obj_tag(v_x_57_) == 0)
{
lean_object* v___x_60_; lean_object* v___x_61_; 
lean_dec(v_h__2_59_);
v___x_60_ = lean_box(0);
v___x_61_ = lean_apply_1(v_h__1_58_, v___x_60_);
return v___x_61_;
}
else
{
lean_object* v_head_62_; lean_object* v_tail_63_; lean_object* v___x_64_; 
lean_dec(v_h__1_58_);
v_head_62_ = lean_ctor_get(v_x_57_, 0);
lean_inc(v_head_62_);
v_tail_63_ = lean_ctor_get(v_x_57_, 1);
lean_inc(v_tail_63_);
lean_dec_ref_known(v_x_57_, 2);
v___x_64_ = lean_apply_2(v_h__2_59_, v_head_62_, v_tail_63_);
return v___x_64_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__3_splitter___redArg(lean_object* v_x_65_, lean_object* v_h__1_66_, lean_object* v_h__2_67_){
_start:
{
if (lean_obj_tag(v_x_65_) == 0)
{
lean_object* v___x_68_; lean_object* v___x_69_; 
lean_dec(v_h__2_67_);
v___x_68_ = lean_box(0);
v___x_69_ = lean_apply_1(v_h__1_66_, v___x_68_);
return v___x_69_;
}
else
{
lean_object* v_val_70_; lean_object* v___x_71_; 
lean_dec(v_h__1_66_);
v_val_70_ = lean_ctor_get(v_x_65_, 0);
lean_inc(v_val_70_);
lean_dec_ref_known(v_x_65_, 1);
v___x_71_ = lean_apply_1(v_h__2_67_, v_val_70_);
return v___x_71_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__3_splitter(lean_object* v_motive_72_, lean_object* v_x_73_, lean_object* v_h__1_74_, lean_object* v_h__2_75_){
_start:
{
if (lean_obj_tag(v_x_73_) == 0)
{
lean_object* v___x_76_; lean_object* v___x_77_; 
lean_dec(v_h__2_75_);
v___x_76_ = lean_box(0);
v___x_77_ = lean_apply_1(v_h__1_74_, v___x_76_);
return v___x_77_;
}
else
{
lean_object* v_val_78_; lean_object* v___x_79_; 
lean_dec(v_h__1_74_);
v_val_78_ = lean_ctor_get(v_x_73_, 0);
lean_inc(v_val_78_);
lean_dec_ref_known(v_x_73_, 1);
v___x_79_ = lean_apply_1(v_h__2_75_, v_val_78_);
return v___x_79_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__1_splitter___redArg(lean_object* v_x_80_, lean_object* v_h__1_81_){
_start:
{
lean_object* v_fst_82_; lean_object* v_snd_83_; lean_object* v___x_84_; 
v_fst_82_ = lean_ctor_get(v_x_80_, 0);
lean_inc(v_fst_82_);
v_snd_83_ = lean_ctor_get(v_x_80_, 1);
lean_inc(v_snd_83_);
lean_dec_ref(v_x_80_);
v___x_84_ = lean_apply_2(v_h__1_81_, v_fst_82_, v_snd_83_);
return v___x_84_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_takeDigits_match__1_splitter(lean_object* v_motive_85_, lean_object* v_x_86_, lean_object* v_h__1_87_){
_start:
{
lean_object* v_fst_88_; lean_object* v_snd_89_; lean_object* v___x_90_; 
v_fst_88_ = lean_ctor_get(v_x_86_, 0);
lean_inc(v_fst_88_);
v_snd_89_ = lean_ctor_get(v_x_86_, 1);
lean_inc(v_snd_89_);
lean_dec_ref(v_x_86_);
v___x_90_ = lean_apply_2(v_h__1_87_, v_fst_88_, v_snd_89_);
return v___x_90_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq(lean_object* v_x_93_, lean_object* v_x_94_){
_start:
{
lean_object* v_first_95_; lean_object* v_rest_96_; lean_object* v_first_97_; lean_object* v_rest_98_; uint8_t v___x_99_; 
v_first_95_ = lean_ctor_get(v_x_93_, 0);
lean_inc(v_first_95_);
v_rest_96_ = lean_ctor_get(v_x_93_, 1);
lean_inc(v_rest_96_);
lean_dec_ref(v_x_93_);
v_first_97_ = lean_ctor_get(v_x_94_, 0);
lean_inc(v_first_97_);
v_rest_98_ = lean_ctor_get(v_x_94_, 1);
lean_inc(v_rest_98_);
lean_dec_ref(v_x_94_);
v___x_99_ = lean_nat_dec_eq(v_first_95_, v_first_97_);
lean_dec(v_first_97_);
lean_dec(v_first_95_);
if (v___x_99_ == 0)
{
lean_dec(v_rest_98_);
lean_dec(v_rest_96_);
return v___x_99_;
}
else
{
lean_object* v___x_100_; uint8_t v___x_101_; 
v___x_100_ = ((lean_object*)(lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq___closed__0));
v___x_101_ = l_instDecidableEqList___redArg(v___x_100_, v_rest_96_, v_rest_98_);
return v___x_101_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq___boxed(lean_object* v_x_102_, lean_object* v_x_103_){
_start:
{
uint8_t v_res_104_; lean_object* v_r_105_; 
v_res_104_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq(v_x_102_, v_x_103_);
v_r_105_ = lean_box(v_res_104_);
return v_r_105_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits(lean_object* v_x_106_, lean_object* v_x_107_){
_start:
{
uint8_t v___x_108_; 
v___x_108_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq(v_x_106_, v_x_107_);
return v___x_108_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits___boxed(lean_object* v_x_109_, lean_object* v_x_110_){
_start:
{
uint8_t v_res_111_; lean_object* v_r_112_; 
v_res_111_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits(v_x_109_, v_x_110_);
v_r_112_ = lean_box(v_res_111_);
return v_r_112_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_Digits_list(lean_object* v_ds_113_){
_start:
{
lean_object* v_first_114_; lean_object* v_rest_115_; lean_object* v___x_117_; uint8_t v_isShared_118_; uint8_t v_isSharedCheck_122_; 
v_first_114_ = lean_ctor_get(v_ds_113_, 0);
v_rest_115_ = lean_ctor_get(v_ds_113_, 1);
v_isSharedCheck_122_ = !lean_is_exclusive(v_ds_113_);
if (v_isSharedCheck_122_ == 0)
{
v___x_117_ = v_ds_113_;
v_isShared_118_ = v_isSharedCheck_122_;
goto v_resetjp_116_;
}
else
{
lean_inc(v_rest_115_);
lean_inc(v_first_114_);
lean_dec(v_ds_113_);
v___x_117_ = lean_box(0);
v_isShared_118_ = v_isSharedCheck_122_;
goto v_resetjp_116_;
}
v_resetjp_116_:
{
lean_object* v___x_120_; 
if (v_isShared_118_ == 0)
{
lean_ctor_set_tag(v___x_117_, 1);
v___x_120_ = v___x_117_;
goto v_reusejp_119_;
}
else
{
lean_object* v_reuseFailAlloc_121_; 
v_reuseFailAlloc_121_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_121_, 0, v_first_114_);
lean_ctor_set(v_reuseFailAlloc_121_, 1, v_rest_115_);
v___x_120_ = v_reuseFailAlloc_121_;
goto v_reusejp_119_;
}
v_reusejp_119_:
{
return v___x_120_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_DecimalSyntax_Digits_chars_spec__0(lean_object* v_a_123_, lean_object* v_a_124_){
_start:
{
if (lean_obj_tag(v_a_123_) == 0)
{
lean_object* v___x_125_; 
v___x_125_ = l_List_reverse___redArg(v_a_124_);
return v___x_125_;
}
else
{
lean_object* v_head_126_; lean_object* v_tail_127_; lean_object* v___x_129_; uint8_t v_isShared_130_; uint8_t v_isSharedCheck_137_; 
v_head_126_ = lean_ctor_get(v_a_123_, 0);
v_tail_127_ = lean_ctor_get(v_a_123_, 1);
v_isSharedCheck_137_ = !lean_is_exclusive(v_a_123_);
if (v_isSharedCheck_137_ == 0)
{
v___x_129_ = v_a_123_;
v_isShared_130_ = v_isSharedCheck_137_;
goto v_resetjp_128_;
}
else
{
lean_inc(v_tail_127_);
lean_inc(v_head_126_);
lean_dec(v_a_123_);
v___x_129_ = lean_box(0);
v_isShared_130_ = v_isSharedCheck_137_;
goto v_resetjp_128_;
}
v_resetjp_128_:
{
uint32_t v___x_131_; lean_object* v___x_132_; lean_object* v___x_134_; 
v___x_131_ = l_Nat_digitChar(v_head_126_);
lean_dec(v_head_126_);
v___x_132_ = lean_box_uint32(v___x_131_);
if (v_isShared_130_ == 0)
{
lean_ctor_set(v___x_129_, 1, v_a_124_);
lean_ctor_set(v___x_129_, 0, v___x_132_);
v___x_134_ = v___x_129_;
goto v_reusejp_133_;
}
else
{
lean_object* v_reuseFailAlloc_136_; 
v_reuseFailAlloc_136_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_136_, 0, v___x_132_);
lean_ctor_set(v_reuseFailAlloc_136_, 1, v_a_124_);
v___x_134_ = v_reuseFailAlloc_136_;
goto v_reusejp_133_;
}
v_reusejp_133_:
{
v_a_123_ = v_tail_127_;
v_a_124_ = v___x_134_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_Digits_chars(lean_object* v_ds_138_){
_start:
{
lean_object* v___x_139_; lean_object* v___x_140_; lean_object* v___x_141_; 
v___x_139_ = lp_algalVerification_Algal_Core_DecimalSyntax_Digits_list(v_ds_138_);
v___x_140_ = lean_box(0);
v___x_141_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_DecimalSyntax_Digits_chars_spec__0(v___x_139_, v___x_140_);
return v___x_141_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readDigits(lean_object* v_input_142_){
_start:
{
lean_object* v___x_143_; lean_object* v_fst_144_; 
v___x_143_ = lp_algalVerification_Algal_Core_DecimalSyntax_takeDigits(v_input_142_);
v_fst_144_ = lean_ctor_get(v___x_143_, 0);
lean_inc(v_fst_144_);
if (lean_obj_tag(v_fst_144_) == 0)
{
lean_object* v___x_145_; 
lean_dec_ref(v___x_143_);
v___x_145_ = lean_box(0);
return v___x_145_;
}
else
{
lean_object* v_snd_146_; lean_object* v___x_148_; uint8_t v_isShared_149_; uint8_t v_isSharedCheck_163_; 
v_snd_146_ = lean_ctor_get(v___x_143_, 1);
v_isSharedCheck_163_ = !lean_is_exclusive(v___x_143_);
if (v_isSharedCheck_163_ == 0)
{
lean_object* v_unused_164_; 
v_unused_164_ = lean_ctor_get(v___x_143_, 0);
lean_dec(v_unused_164_);
v___x_148_ = v___x_143_;
v_isShared_149_ = v_isSharedCheck_163_;
goto v_resetjp_147_;
}
else
{
lean_inc(v_snd_146_);
lean_dec(v___x_143_);
v___x_148_ = lean_box(0);
v_isShared_149_ = v_isSharedCheck_163_;
goto v_resetjp_147_;
}
v_resetjp_147_:
{
lean_object* v_head_150_; lean_object* v_tail_151_; lean_object* v___x_153_; uint8_t v_isShared_154_; uint8_t v_isSharedCheck_162_; 
v_head_150_ = lean_ctor_get(v_fst_144_, 0);
v_tail_151_ = lean_ctor_get(v_fst_144_, 1);
v_isSharedCheck_162_ = !lean_is_exclusive(v_fst_144_);
if (v_isSharedCheck_162_ == 0)
{
v___x_153_ = v_fst_144_;
v_isShared_154_ = v_isSharedCheck_162_;
goto v_resetjp_152_;
}
else
{
lean_inc(v_tail_151_);
lean_inc(v_head_150_);
lean_dec(v_fst_144_);
v___x_153_ = lean_box(0);
v_isShared_154_ = v_isSharedCheck_162_;
goto v_resetjp_152_;
}
v_resetjp_152_:
{
lean_object* v___x_156_; 
if (v_isShared_154_ == 0)
{
lean_ctor_set_tag(v___x_153_, 0);
v___x_156_ = v___x_153_;
goto v_reusejp_155_;
}
else
{
lean_object* v_reuseFailAlloc_161_; 
v_reuseFailAlloc_161_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_161_, 0, v_head_150_);
lean_ctor_set(v_reuseFailAlloc_161_, 1, v_tail_151_);
v___x_156_ = v_reuseFailAlloc_161_;
goto v_reusejp_155_;
}
v_reusejp_155_:
{
lean_object* v___x_158_; 
if (v_isShared_149_ == 0)
{
lean_ctor_set(v___x_148_, 0, v___x_156_);
v___x_158_ = v___x_148_;
goto v_reusejp_157_;
}
else
{
lean_object* v_reuseFailAlloc_160_; 
v_reuseFailAlloc_160_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_160_, 0, v___x_156_);
lean_ctor_set(v_reuseFailAlloc_160_, 1, v_snd_146_);
v___x_158_ = v_reuseFailAlloc_160_;
goto v_reusejp_157_;
}
v_reusejp_157_:
{
lean_object* v___x_159_; 
v___x_159_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_159_, 0, v___x_158_);
return v___x_159_;
}
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart_decEq(lean_object* v_x_165_, lean_object* v_x_166_){
_start:
{
uint8_t v___x_167_; 
v___x_167_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq(v_x_165_, v_x_166_);
return v___x_167_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart_decEq___boxed(lean_object* v_x_168_, lean_object* v_x_169_){
_start:
{
uint8_t v_res_170_; lean_object* v_r_171_; 
v_res_170_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart_decEq(v_x_168_, v_x_169_);
v_r_171_ = lean_box(v_res_170_);
return v_r_171_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart(lean_object* v_x_172_, lean_object* v_x_173_){
_start:
{
uint8_t v___x_174_; 
v___x_174_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq(v_x_172_, v_x_173_);
return v___x_174_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart___boxed(lean_object* v_x_175_, lean_object* v_x_176_){
_start:
{
uint8_t v_res_177_; lean_object* v_r_178_; 
v_res_177_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqIntegerPart(v_x_175_, v_x_176_);
v_r_178_ = lean_box(v_res_177_);
return v_r_178_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readInteger(lean_object* v_input_179_){
_start:
{
lean_object* v___x_180_; 
v___x_180_ = lp_algalVerification_Algal_Core_DecimalSyntax_readDigits(v_input_179_);
if (lean_obj_tag(v___x_180_) == 0)
{
lean_object* v___x_181_; 
v___x_181_ = lean_box(0);
return v___x_181_;
}
else
{
lean_object* v_val_182_; lean_object* v___x_184_; uint8_t v_isShared_185_; uint8_t v_isSharedCheck_205_; 
v_val_182_ = lean_ctor_get(v___x_180_, 0);
v_isSharedCheck_205_ = !lean_is_exclusive(v___x_180_);
if (v_isSharedCheck_205_ == 0)
{
v___x_184_ = v___x_180_;
v_isShared_185_ = v_isSharedCheck_205_;
goto v_resetjp_183_;
}
else
{
lean_inc(v_val_182_);
lean_dec(v___x_180_);
v___x_184_ = lean_box(0);
v_isShared_185_ = v_isSharedCheck_205_;
goto v_resetjp_183_;
}
v_resetjp_183_:
{
lean_object* v_fst_186_; lean_object* v_snd_187_; lean_object* v___x_189_; uint8_t v_isShared_190_; uint8_t v_isSharedCheck_204_; 
v_fst_186_ = lean_ctor_get(v_val_182_, 0);
v_snd_187_ = lean_ctor_get(v_val_182_, 1);
v_isSharedCheck_204_ = !lean_is_exclusive(v_val_182_);
if (v_isSharedCheck_204_ == 0)
{
v___x_189_ = v_val_182_;
v_isShared_190_ = v_isSharedCheck_204_;
goto v_resetjp_188_;
}
else
{
lean_inc(v_snd_187_);
lean_inc(v_fst_186_);
lean_dec(v_val_182_);
v___x_189_ = lean_box(0);
v_isShared_190_ = v_isSharedCheck_204_;
goto v_resetjp_188_;
}
v_resetjp_188_:
{
lean_object* v_first_198_; lean_object* v_rest_199_; lean_object* v___x_200_; uint8_t v___x_201_; 
v_first_198_ = lean_ctor_get(v_fst_186_, 0);
v_rest_199_ = lean_ctor_get(v_fst_186_, 1);
v___x_200_ = lean_unsigned_to_nat(0u);
v___x_201_ = lean_nat_dec_eq(v_first_198_, v___x_200_);
if (v___x_201_ == 0)
{
goto v___jp_191_;
}
else
{
uint8_t v___x_202_; 
v___x_202_ = l_List_instDecidableEqNil___redArg(v_rest_199_);
if (v___x_202_ == 0)
{
lean_object* v___x_203_; 
lean_del_object(v___x_189_);
lean_dec(v_snd_187_);
lean_dec(v_fst_186_);
lean_del_object(v___x_184_);
v___x_203_ = lean_box(0);
return v___x_203_;
}
else
{
goto v___jp_191_;
}
}
v___jp_191_:
{
lean_object* v___x_193_; 
if (v_isShared_190_ == 0)
{
v___x_193_ = v___x_189_;
goto v_reusejp_192_;
}
else
{
lean_object* v_reuseFailAlloc_197_; 
v_reuseFailAlloc_197_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_197_, 0, v_fst_186_);
lean_ctor_set(v_reuseFailAlloc_197_, 1, v_snd_187_);
v___x_193_ = v_reuseFailAlloc_197_;
goto v_reusejp_192_;
}
v_reusejp_192_:
{
lean_object* v___x_195_; 
if (v_isShared_185_ == 0)
{
lean_ctor_set(v___x_184_, 0, v___x_193_);
v___x_195_ = v___x_184_;
goto v_reusejp_194_;
}
else
{
lean_object* v_reuseFailAlloc_196_; 
v_reuseFailAlloc_196_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_196_, 0, v___x_193_);
v___x_195_ = v_reuseFailAlloc_196_;
goto v_reusejp_194_;
}
v_reusejp_194_:
{
return v___x_195_;
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorIdx(uint8_t v_x_206_){
_start:
{
switch(v_x_206_)
{
case 0:
{
lean_object* v___x_207_; 
v___x_207_ = lean_unsigned_to_nat(0u);
return v___x_207_;
}
case 1:
{
lean_object* v___x_208_; 
v___x_208_ = lean_unsigned_to_nat(1u);
return v___x_208_;
}
default: 
{
lean_object* v___x_209_; 
v___x_209_ = lean_unsigned_to_nat(2u);
return v___x_209_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorIdx___boxed(lean_object* v_x_210_){
_start:
{
uint8_t v_x_boxed_211_; lean_object* v_res_212_; 
v_x_boxed_211_ = lean_unbox(v_x_210_);
v_res_212_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorIdx(v_x_boxed_211_);
return v_res_212_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim___redArg(lean_object* v_k_213_){
_start:
{
lean_inc(v_k_213_);
return v_k_213_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim___redArg___boxed(lean_object* v_k_214_){
_start:
{
lean_object* v_res_215_; 
v_res_215_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim___redArg(v_k_214_);
lean_dec(v_k_214_);
return v_res_215_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim(lean_object* v_motive_216_, lean_object* v_ctorIdx_217_, uint8_t v_t_218_, lean_object* v_h_219_, lean_object* v_k_220_){
_start:
{
lean_inc(v_k_220_);
return v_k_220_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim___boxed(lean_object* v_motive_221_, lean_object* v_ctorIdx_222_, lean_object* v_t_223_, lean_object* v_h_224_, lean_object* v_k_225_){
_start:
{
uint8_t v_t_boxed_226_; lean_object* v_res_227_; 
v_t_boxed_226_ = lean_unbox(v_t_223_);
v_res_227_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorElim(v_motive_221_, v_ctorIdx_222_, v_t_boxed_226_, v_h_224_, v_k_225_);
lean_dec(v_k_225_);
lean_dec(v_ctorIdx_222_);
return v_res_227_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim___redArg(lean_object* v_absent_228_){
_start:
{
lean_inc(v_absent_228_);
return v_absent_228_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim___redArg___boxed(lean_object* v_absent_229_){
_start:
{
lean_object* v_res_230_; 
v_res_230_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim___redArg(v_absent_229_);
lean_dec(v_absent_229_);
return v_res_230_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim(lean_object* v_motive_231_, uint8_t v_t_232_, lean_object* v_h_233_, lean_object* v_absent_234_){
_start:
{
lean_inc(v_absent_234_);
return v_absent_234_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim___boxed(lean_object* v_motive_235_, lean_object* v_t_236_, lean_object* v_h_237_, lean_object* v_absent_238_){
_start:
{
uint8_t v_t_boxed_239_; lean_object* v_res_240_; 
v_t_boxed_239_ = lean_unbox(v_t_236_);
v_res_240_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_absent_elim(v_motive_235_, v_t_boxed_239_, v_h_237_, v_absent_238_);
lean_dec(v_absent_238_);
return v_res_240_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim___redArg(lean_object* v_plus_241_){
_start:
{
lean_inc(v_plus_241_);
return v_plus_241_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim___redArg___boxed(lean_object* v_plus_242_){
_start:
{
lean_object* v_res_243_; 
v_res_243_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim___redArg(v_plus_242_);
lean_dec(v_plus_242_);
return v_res_243_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim(lean_object* v_motive_244_, uint8_t v_t_245_, lean_object* v_h_246_, lean_object* v_plus_247_){
_start:
{
lean_inc(v_plus_247_);
return v_plus_247_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim___boxed(lean_object* v_motive_248_, lean_object* v_t_249_, lean_object* v_h_250_, lean_object* v_plus_251_){
_start:
{
uint8_t v_t_boxed_252_; lean_object* v_res_253_; 
v_t_boxed_252_ = lean_unbox(v_t_249_);
v_res_253_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_plus_elim(v_motive_248_, v_t_boxed_252_, v_h_250_, v_plus_251_);
lean_dec(v_plus_251_);
return v_res_253_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim___redArg(lean_object* v_minus_254_){
_start:
{
lean_inc(v_minus_254_);
return v_minus_254_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim___redArg___boxed(lean_object* v_minus_255_){
_start:
{
lean_object* v_res_256_; 
v_res_256_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim___redArg(v_minus_255_);
lean_dec(v_minus_255_);
return v_res_256_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim(lean_object* v_motive_257_, uint8_t v_t_258_, lean_object* v_h_259_, lean_object* v_minus_260_){
_start:
{
lean_inc(v_minus_260_);
return v_minus_260_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim___boxed(lean_object* v_motive_261_, lean_object* v_t_262_, lean_object* v_h_263_, lean_object* v_minus_264_){
_start:
{
uint8_t v_t_boxed_265_; lean_object* v_res_266_; 
v_t_boxed_265_ = lean_unbox(v_t_262_);
v_res_266_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_minus_elim(v_motive_261_, v_t_boxed_265_, v_h_263_, v_minus_264_);
lean_dec(v_minus_264_);
return v_res_266_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ofNat(lean_object* v_n_267_){
_start:
{
lean_object* v___x_268_; uint8_t v___x_269_; 
v___x_268_ = lean_unsigned_to_nat(0u);
v___x_269_ = lean_nat_dec_le(v_n_267_, v___x_268_);
if (v___x_269_ == 0)
{
lean_object* v___x_270_; uint8_t v___x_271_; 
v___x_270_ = lean_unsigned_to_nat(1u);
v___x_271_ = lean_nat_dec_le(v_n_267_, v___x_270_);
if (v___x_271_ == 0)
{
uint8_t v___x_272_; 
v___x_272_ = 2;
return v___x_272_;
}
else
{
uint8_t v___x_273_; 
v___x_273_ = 1;
return v___x_273_;
}
}
else
{
uint8_t v___x_274_; 
v___x_274_ = 0;
return v___x_274_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ofNat___boxed(lean_object* v_n_275_){
_start:
{
uint8_t v_res_276_; lean_object* v_r_277_; 
v_res_276_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ofNat(v_n_275_);
lean_dec(v_n_275_);
v_r_277_ = lean_box(v_res_276_);
return v_r_277_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentSign(uint8_t v_x_278_, uint8_t v_y_279_){
_start:
{
lean_object* v___x_280_; lean_object* v___x_281_; uint8_t v___x_282_; 
v___x_280_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorIdx(v_x_278_);
v___x_281_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_ctorIdx(v_y_279_);
v___x_282_ = lean_nat_dec_eq(v___x_280_, v___x_281_);
lean_dec(v___x_281_);
lean_dec(v___x_280_);
return v___x_282_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentSign___boxed(lean_object* v_x_283_, lean_object* v_y_284_){
_start:
{
uint8_t v_x_13__boxed_285_; uint8_t v_y_14__boxed_286_; uint8_t v_res_287_; lean_object* v_r_288_; 
v_x_13__boxed_285_ = lean_unbox(v_x_283_);
v_y_14__boxed_286_ = lean_unbox(v_y_284_);
v_res_287_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentSign(v_x_13__boxed_285_, v_y_14__boxed_286_);
v_r_288_ = lean_box(v_res_287_);
return v_r_288_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0___boxed__const__1(void){
_start:
{
uint32_t v___x_289_; lean_object* v___x_290_; 
v___x_289_ = 43;
v___x_290_ = lean_box_uint32(v___x_289_);
return v___x_290_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0(void){
_start:
{
lean_object* v___x_291_; lean_object* v___x_292_; lean_object* v___x_293_; 
v___x_291_ = lean_box(0);
v___x_292_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0___boxed__const__1;
v___x_293_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_293_, 0, v___x_292_);
lean_ctor_set(v___x_293_, 1, v___x_291_);
return v___x_293_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1___boxed__const__1(void){
_start:
{
uint32_t v___x_294_; lean_object* v___x_295_; 
v___x_294_ = 45;
v___x_295_ = lean_box_uint32(v___x_294_);
return v___x_295_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1(void){
_start:
{
lean_object* v___x_296_; lean_object* v___x_297_; lean_object* v___x_298_; 
v___x_296_ = lean_box(0);
v___x_297_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1___boxed__const__1;
v___x_298_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_298_, 0, v___x_297_);
lean_ctor_set(v___x_298_, 1, v___x_296_);
return v___x_298_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars(uint8_t v_x_299_){
_start:
{
switch(v_x_299_)
{
case 0:
{
lean_object* v___x_300_; 
v___x_300_ = lean_box(0);
return v___x_300_;
}
case 1:
{
lean_object* v___x_301_; 
v___x_301_ = lean_obj_once(&lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0, &lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0_once, _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0);
return v___x_301_;
}
default: 
{
lean_object* v___x_302_; 
v___x_302_ = lean_obj_once(&lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1, &lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1_once, _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1);
return v___x_302_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___boxed(lean_object* v_x_303_){
_start:
{
uint8_t v_x_47__boxed_304_; lean_object* v_res_305_; 
v_x_47__boxed_304_ = lean_unbox(v_x_303_);
v_res_305_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars(v_x_47__boxed_304_);
return v_res_305_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart_decEq(lean_object* v_x_306_, lean_object* v_x_307_){
_start:
{
uint8_t v_upper_308_; uint8_t v_sign_309_; lean_object* v_digits_310_; uint8_t v_upper_311_; uint8_t v_sign_312_; lean_object* v_digits_313_; 
v_upper_308_ = lean_ctor_get_uint8(v_x_306_, sizeof(void*)*1);
v_sign_309_ = lean_ctor_get_uint8(v_x_306_, sizeof(void*)*1 + 1);
v_digits_310_ = lean_ctor_get(v_x_306_, 0);
lean_inc_ref(v_digits_310_);
lean_dec_ref(v_x_306_);
v_upper_311_ = lean_ctor_get_uint8(v_x_307_, sizeof(void*)*1);
v_sign_312_ = lean_ctor_get_uint8(v_x_307_, sizeof(void*)*1 + 1);
v_digits_313_ = lean_ctor_get(v_x_307_, 0);
lean_inc_ref(v_digits_313_);
lean_dec_ref(v_x_307_);
if (v_upper_308_ == 0)
{
if (v_upper_311_ == 0)
{
goto v___jp_314_;
}
else
{
lean_dec_ref(v_digits_313_);
lean_dec_ref(v_digits_310_);
return v_upper_308_;
}
}
else
{
if (v_upper_311_ == 0)
{
lean_dec_ref(v_digits_313_);
lean_dec_ref(v_digits_310_);
return v_upper_311_;
}
else
{
goto v___jp_314_;
}
}
v___jp_314_:
{
uint8_t v___x_315_; 
v___x_315_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentSign(v_sign_309_, v_sign_312_);
if (v___x_315_ == 0)
{
lean_dec_ref(v_digits_313_);
lean_dec_ref(v_digits_310_);
return v___x_315_;
}
else
{
uint8_t v___x_316_; 
v___x_316_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq(v_digits_310_, v_digits_313_);
return v___x_316_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart_decEq___boxed(lean_object* v_x_317_, lean_object* v_x_318_){
_start:
{
uint8_t v_res_319_; lean_object* v_r_320_; 
v_res_319_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart_decEq(v_x_317_, v_x_318_);
v_r_320_ = lean_box(v_res_319_);
return v_r_320_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart(lean_object* v_x_321_, lean_object* v_x_322_){
_start:
{
uint8_t v___x_323_; 
v___x_323_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart_decEq(v_x_321_, v_x_322_);
return v___x_323_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart___boxed(lean_object* v_x_324_, lean_object* v_x_325_){
_start:
{
uint8_t v_res_326_; lean_object* v_r_327_; 
v_res_326_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart(v_x_324_, v_x_325_);
v_r_327_ = lean_box(v_res_326_);
return v_r_327_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_ExponentPart_chars(lean_object* v_part_328_){
_start:
{
uint8_t v_upper_329_; uint8_t v_sign_330_; lean_object* v_digits_331_; uint32_t v___y_333_; 
v_upper_329_ = lean_ctor_get_uint8(v_part_328_, sizeof(void*)*1);
v_sign_330_ = lean_ctor_get_uint8(v_part_328_, sizeof(void*)*1 + 1);
v_digits_331_ = lean_ctor_get(v_part_328_, 0);
lean_inc_ref(v_digits_331_);
lean_dec_ref(v_part_328_);
if (v_upper_329_ == 0)
{
uint32_t v___x_339_; 
v___x_339_ = 101;
v___y_333_ = v___x_339_;
goto v___jp_332_;
}
else
{
uint32_t v___x_340_; 
v___x_340_ = 69;
v___y_333_ = v___x_340_;
goto v___jp_332_;
}
v___jp_332_:
{
lean_object* v___x_334_; lean_object* v___x_335_; lean_object* v___x_336_; lean_object* v___x_337_; lean_object* v___x_338_; 
v___x_334_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars(v_sign_330_);
v___x_335_ = lean_box_uint32(v___y_333_);
v___x_336_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_336_, 0, v___x_335_);
lean_ctor_set(v___x_336_, 1, v___x_334_);
v___x_337_ = lp_algalVerification_Algal_Core_DecimalSyntax_Digits_chars(v_digits_331_);
v___x_338_ = l_List_appendTR___redArg(v___x_336_, v___x_337_);
return v___x_338_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readExponentSign(lean_object* v_x_341_){
_start:
{
lean_object* v_rest_343_; 
if (lean_obj_tag(v_x_341_) == 1)
{
lean_object* v_head_347_; lean_object* v_tail_348_; uint32_t v___x_349_; uint32_t v___x_350_; uint8_t v___x_351_; 
v_head_347_ = lean_ctor_get(v_x_341_, 0);
v_tail_348_ = lean_ctor_get(v_x_341_, 1);
v___x_349_ = 43;
v___x_350_ = lean_unbox_uint32(v_head_347_);
v___x_351_ = lean_uint32_dec_eq(v___x_350_, v___x_349_);
if (v___x_351_ == 0)
{
uint32_t v___x_352_; uint32_t v___x_353_; uint8_t v___x_354_; 
v___x_352_ = 45;
v___x_353_ = lean_unbox_uint32(v_head_347_);
v___x_354_ = lean_uint32_dec_eq(v___x_353_, v___x_352_);
if (v___x_354_ == 0)
{
v_rest_343_ = v_x_341_;
goto v___jp_342_;
}
else
{
lean_object* v___x_356_; uint8_t v_isShared_357_; uint8_t v_isSharedCheck_363_; 
lean_inc(v_tail_348_);
v_isSharedCheck_363_ = !lean_is_exclusive(v_x_341_);
if (v_isSharedCheck_363_ == 0)
{
lean_object* v_unused_364_; lean_object* v_unused_365_; 
v_unused_364_ = lean_ctor_get(v_x_341_, 1);
lean_dec(v_unused_364_);
v_unused_365_ = lean_ctor_get(v_x_341_, 0);
lean_dec(v_unused_365_);
v___x_356_ = v_x_341_;
v_isShared_357_ = v_isSharedCheck_363_;
goto v_resetjp_355_;
}
else
{
lean_dec(v_x_341_);
v___x_356_ = lean_box(0);
v_isShared_357_ = v_isSharedCheck_363_;
goto v_resetjp_355_;
}
v_resetjp_355_:
{
uint8_t v___x_358_; lean_object* v___x_359_; lean_object* v___x_361_; 
v___x_358_ = 2;
v___x_359_ = lean_box(v___x_358_);
if (v_isShared_357_ == 0)
{
lean_ctor_set_tag(v___x_356_, 0);
lean_ctor_set(v___x_356_, 0, v___x_359_);
v___x_361_ = v___x_356_;
goto v_reusejp_360_;
}
else
{
lean_object* v_reuseFailAlloc_362_; 
v_reuseFailAlloc_362_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_362_, 0, v___x_359_);
lean_ctor_set(v_reuseFailAlloc_362_, 1, v_tail_348_);
v___x_361_ = v_reuseFailAlloc_362_;
goto v_reusejp_360_;
}
v_reusejp_360_:
{
return v___x_361_;
}
}
}
}
else
{
lean_object* v___x_367_; uint8_t v_isShared_368_; uint8_t v_isSharedCheck_374_; 
lean_inc(v_tail_348_);
v_isSharedCheck_374_ = !lean_is_exclusive(v_x_341_);
if (v_isSharedCheck_374_ == 0)
{
lean_object* v_unused_375_; lean_object* v_unused_376_; 
v_unused_375_ = lean_ctor_get(v_x_341_, 1);
lean_dec(v_unused_375_);
v_unused_376_ = lean_ctor_get(v_x_341_, 0);
lean_dec(v_unused_376_);
v___x_367_ = v_x_341_;
v_isShared_368_ = v_isSharedCheck_374_;
goto v_resetjp_366_;
}
else
{
lean_dec(v_x_341_);
v___x_367_ = lean_box(0);
v_isShared_368_ = v_isSharedCheck_374_;
goto v_resetjp_366_;
}
v_resetjp_366_:
{
uint8_t v___x_369_; lean_object* v___x_370_; lean_object* v___x_372_; 
v___x_369_ = 1;
v___x_370_ = lean_box(v___x_369_);
if (v_isShared_368_ == 0)
{
lean_ctor_set_tag(v___x_367_, 0);
lean_ctor_set(v___x_367_, 0, v___x_370_);
v___x_372_ = v___x_367_;
goto v_reusejp_371_;
}
else
{
lean_object* v_reuseFailAlloc_373_; 
v_reuseFailAlloc_373_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_373_, 0, v___x_370_);
lean_ctor_set(v_reuseFailAlloc_373_, 1, v_tail_348_);
v___x_372_ = v_reuseFailAlloc_373_;
goto v_reusejp_371_;
}
v_reusejp_371_:
{
return v___x_372_;
}
}
}
}
else
{
v_rest_343_ = v_x_341_;
goto v___jp_342_;
}
v___jp_342_:
{
uint8_t v___x_344_; lean_object* v___x_345_; lean_object* v___x_346_; 
v___x_344_ = 0;
v___x_345_ = lean_box(v___x_344_);
v___x_346_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_346_, 0, v___x_345_);
lean_ctor_set(v___x_346_, 1, v_rest_343_);
return v___x_346_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readExponentTail(uint8_t v_upper_377_, lean_object* v_input_378_){
_start:
{
lean_object* v___x_379_; lean_object* v_fst_380_; lean_object* v_snd_381_; lean_object* v___x_382_; 
v___x_379_ = lp_algalVerification_Algal_Core_DecimalSyntax_readExponentSign(v_input_378_);
v_fst_380_ = lean_ctor_get(v___x_379_, 0);
lean_inc(v_fst_380_);
v_snd_381_ = lean_ctor_get(v___x_379_, 1);
lean_inc(v_snd_381_);
lean_dec_ref(v___x_379_);
v___x_382_ = lp_algalVerification_Algal_Core_DecimalSyntax_readDigits(v_snd_381_);
if (lean_obj_tag(v___x_382_) == 0)
{
lean_object* v___x_383_; 
lean_dec(v_fst_380_);
v___x_383_ = lean_box(0);
return v___x_383_;
}
else
{
lean_object* v_val_384_; lean_object* v___x_386_; uint8_t v_isShared_387_; uint8_t v_isSharedCheck_402_; 
v_val_384_ = lean_ctor_get(v___x_382_, 0);
v_isSharedCheck_402_ = !lean_is_exclusive(v___x_382_);
if (v_isSharedCheck_402_ == 0)
{
v___x_386_ = v___x_382_;
v_isShared_387_ = v_isSharedCheck_402_;
goto v_resetjp_385_;
}
else
{
lean_inc(v_val_384_);
lean_dec(v___x_382_);
v___x_386_ = lean_box(0);
v_isShared_387_ = v_isSharedCheck_402_;
goto v_resetjp_385_;
}
v_resetjp_385_:
{
lean_object* v_fst_388_; lean_object* v_snd_389_; lean_object* v___x_391_; uint8_t v_isShared_392_; uint8_t v_isSharedCheck_401_; 
v_fst_388_ = lean_ctor_get(v_val_384_, 0);
v_snd_389_ = lean_ctor_get(v_val_384_, 1);
v_isSharedCheck_401_ = !lean_is_exclusive(v_val_384_);
if (v_isSharedCheck_401_ == 0)
{
v___x_391_ = v_val_384_;
v_isShared_392_ = v_isSharedCheck_401_;
goto v_resetjp_390_;
}
else
{
lean_inc(v_snd_389_);
lean_inc(v_fst_388_);
lean_dec(v_val_384_);
v___x_391_ = lean_box(0);
v_isShared_392_ = v_isSharedCheck_401_;
goto v_resetjp_390_;
}
v_resetjp_390_:
{
lean_object* v___x_393_; uint8_t v___x_394_; lean_object* v___x_396_; 
v___x_393_ = lean_alloc_ctor(0, 1, 2);
lean_ctor_set(v___x_393_, 0, v_fst_388_);
lean_ctor_set_uint8(v___x_393_, sizeof(void*)*1, v_upper_377_);
v___x_394_ = lean_unbox(v_fst_380_);
lean_dec(v_fst_380_);
lean_ctor_set_uint8(v___x_393_, sizeof(void*)*1 + 1, v___x_394_);
if (v_isShared_392_ == 0)
{
lean_ctor_set(v___x_391_, 0, v___x_393_);
v___x_396_ = v___x_391_;
goto v_reusejp_395_;
}
else
{
lean_object* v_reuseFailAlloc_400_; 
v_reuseFailAlloc_400_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_400_, 0, v___x_393_);
lean_ctor_set(v_reuseFailAlloc_400_, 1, v_snd_389_);
v___x_396_ = v_reuseFailAlloc_400_;
goto v_reusejp_395_;
}
v_reusejp_395_:
{
lean_object* v___x_398_; 
if (v_isShared_387_ == 0)
{
lean_ctor_set(v___x_386_, 0, v___x_396_);
v___x_398_ = v___x_386_;
goto v_reusejp_397_;
}
else
{
lean_object* v_reuseFailAlloc_399_; 
v_reuseFailAlloc_399_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_399_, 0, v___x_396_);
v___x_398_ = v_reuseFailAlloc_399_;
goto v_reusejp_397_;
}
v_reusejp_397_:
{
return v___x_398_;
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readExponentTail___boxed(lean_object* v_upper_403_, lean_object* v_input_404_){
_start:
{
uint8_t v_upper_boxed_405_; lean_object* v_res_406_; 
v_upper_boxed_405_ = lean_unbox(v_upper_403_);
v_res_406_ = lp_algalVerification_Algal_Core_DecimalSyntax_readExponentTail(v_upper_boxed_405_, v_input_404_);
return v_res_406_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readExponent(lean_object* v_x_407_){
_start:
{
lean_object* v_rest_409_; 
if (lean_obj_tag(v_x_407_) == 1)
{
lean_object* v_head_413_; lean_object* v_tail_414_; uint32_t v___x_415_; uint32_t v___x_416_; uint8_t v___x_417_; 
v_head_413_ = lean_ctor_get(v_x_407_, 0);
v_tail_414_ = lean_ctor_get(v_x_407_, 1);
v___x_415_ = 101;
v___x_416_ = lean_unbox_uint32(v_head_413_);
v___x_417_ = lean_uint32_dec_eq(v___x_416_, v___x_415_);
if (v___x_417_ == 0)
{
uint32_t v___x_418_; uint32_t v___x_419_; uint8_t v___x_420_; 
v___x_418_ = 69;
v___x_419_ = lean_unbox_uint32(v_head_413_);
v___x_420_ = lean_uint32_dec_eq(v___x_419_, v___x_418_);
if (v___x_420_ == 0)
{
v_rest_409_ = v_x_407_;
goto v___jp_408_;
}
else
{
lean_object* v___x_421_; 
lean_inc(v_tail_414_);
lean_dec_ref_known(v_x_407_, 2);
v___x_421_ = lp_algalVerification_Algal_Core_DecimalSyntax_readExponentTail(v___x_420_, v_tail_414_);
if (lean_obj_tag(v___x_421_) == 0)
{
lean_object* v___x_422_; 
v___x_422_ = lean_box(0);
return v___x_422_;
}
else
{
lean_object* v_val_423_; lean_object* v___x_425_; uint8_t v_isShared_426_; uint8_t v_isSharedCheck_440_; 
v_val_423_ = lean_ctor_get(v___x_421_, 0);
v_isSharedCheck_440_ = !lean_is_exclusive(v___x_421_);
if (v_isSharedCheck_440_ == 0)
{
v___x_425_ = v___x_421_;
v_isShared_426_ = v_isSharedCheck_440_;
goto v_resetjp_424_;
}
else
{
lean_inc(v_val_423_);
lean_dec(v___x_421_);
v___x_425_ = lean_box(0);
v_isShared_426_ = v_isSharedCheck_440_;
goto v_resetjp_424_;
}
v_resetjp_424_:
{
lean_object* v_fst_427_; lean_object* v_snd_428_; lean_object* v___x_430_; uint8_t v_isShared_431_; uint8_t v_isSharedCheck_439_; 
v_fst_427_ = lean_ctor_get(v_val_423_, 0);
v_snd_428_ = lean_ctor_get(v_val_423_, 1);
v_isSharedCheck_439_ = !lean_is_exclusive(v_val_423_);
if (v_isSharedCheck_439_ == 0)
{
v___x_430_ = v_val_423_;
v_isShared_431_ = v_isSharedCheck_439_;
goto v_resetjp_429_;
}
else
{
lean_inc(v_snd_428_);
lean_inc(v_fst_427_);
lean_dec(v_val_423_);
v___x_430_ = lean_box(0);
v_isShared_431_ = v_isSharedCheck_439_;
goto v_resetjp_429_;
}
v_resetjp_429_:
{
lean_object* v___x_433_; 
if (v_isShared_426_ == 0)
{
lean_ctor_set(v___x_425_, 0, v_fst_427_);
v___x_433_ = v___x_425_;
goto v_reusejp_432_;
}
else
{
lean_object* v_reuseFailAlloc_438_; 
v_reuseFailAlloc_438_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_438_, 0, v_fst_427_);
v___x_433_ = v_reuseFailAlloc_438_;
goto v_reusejp_432_;
}
v_reusejp_432_:
{
lean_object* v___x_435_; 
if (v_isShared_431_ == 0)
{
lean_ctor_set(v___x_430_, 0, v___x_433_);
v___x_435_ = v___x_430_;
goto v_reusejp_434_;
}
else
{
lean_object* v_reuseFailAlloc_437_; 
v_reuseFailAlloc_437_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_437_, 0, v___x_433_);
lean_ctor_set(v_reuseFailAlloc_437_, 1, v_snd_428_);
v___x_435_ = v_reuseFailAlloc_437_;
goto v_reusejp_434_;
}
v_reusejp_434_:
{
lean_object* v___x_436_; 
v___x_436_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_436_, 0, v___x_435_);
return v___x_436_;
}
}
}
}
}
}
}
else
{
uint8_t v___x_441_; lean_object* v___x_442_; 
lean_inc(v_tail_414_);
lean_dec_ref_known(v_x_407_, 2);
v___x_441_ = 0;
v___x_442_ = lp_algalVerification_Algal_Core_DecimalSyntax_readExponentTail(v___x_441_, v_tail_414_);
if (lean_obj_tag(v___x_442_) == 0)
{
lean_object* v___x_443_; 
v___x_443_ = lean_box(0);
return v___x_443_;
}
else
{
lean_object* v_val_444_; lean_object* v___x_446_; uint8_t v_isShared_447_; uint8_t v_isSharedCheck_461_; 
v_val_444_ = lean_ctor_get(v___x_442_, 0);
v_isSharedCheck_461_ = !lean_is_exclusive(v___x_442_);
if (v_isSharedCheck_461_ == 0)
{
v___x_446_ = v___x_442_;
v_isShared_447_ = v_isSharedCheck_461_;
goto v_resetjp_445_;
}
else
{
lean_inc(v_val_444_);
lean_dec(v___x_442_);
v___x_446_ = lean_box(0);
v_isShared_447_ = v_isSharedCheck_461_;
goto v_resetjp_445_;
}
v_resetjp_445_:
{
lean_object* v_fst_448_; lean_object* v_snd_449_; lean_object* v___x_451_; uint8_t v_isShared_452_; uint8_t v_isSharedCheck_460_; 
v_fst_448_ = lean_ctor_get(v_val_444_, 0);
v_snd_449_ = lean_ctor_get(v_val_444_, 1);
v_isSharedCheck_460_ = !lean_is_exclusive(v_val_444_);
if (v_isSharedCheck_460_ == 0)
{
v___x_451_ = v_val_444_;
v_isShared_452_ = v_isSharedCheck_460_;
goto v_resetjp_450_;
}
else
{
lean_inc(v_snd_449_);
lean_inc(v_fst_448_);
lean_dec(v_val_444_);
v___x_451_ = lean_box(0);
v_isShared_452_ = v_isSharedCheck_460_;
goto v_resetjp_450_;
}
v_resetjp_450_:
{
lean_object* v___x_454_; 
if (v_isShared_447_ == 0)
{
lean_ctor_set(v___x_446_, 0, v_fst_448_);
v___x_454_ = v___x_446_;
goto v_reusejp_453_;
}
else
{
lean_object* v_reuseFailAlloc_459_; 
v_reuseFailAlloc_459_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_459_, 0, v_fst_448_);
v___x_454_ = v_reuseFailAlloc_459_;
goto v_reusejp_453_;
}
v_reusejp_453_:
{
lean_object* v___x_456_; 
if (v_isShared_452_ == 0)
{
lean_ctor_set(v___x_451_, 0, v___x_454_);
v___x_456_ = v___x_451_;
goto v_reusejp_455_;
}
else
{
lean_object* v_reuseFailAlloc_458_; 
v_reuseFailAlloc_458_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_458_, 0, v___x_454_);
lean_ctor_set(v_reuseFailAlloc_458_, 1, v_snd_449_);
v___x_456_ = v_reuseFailAlloc_458_;
goto v_reusejp_455_;
}
v_reusejp_455_:
{
lean_object* v___x_457_; 
v___x_457_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_457_, 0, v___x_456_);
return v___x_457_;
}
}
}
}
}
}
}
else
{
v_rest_409_ = v_x_407_;
goto v___jp_408_;
}
v___jp_408_:
{
lean_object* v___x_410_; lean_object* v___x_411_; lean_object* v___x_412_; 
v___x_410_ = lean_box(0);
v___x_411_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_411_, 0, v___x_410_);
lean_ctor_set(v___x_411_, 1, v_rest_409_);
v___x_412_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_412_, 0, v___x_411_);
return v___x_412_;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars___boxed__const__1(void){
_start:
{
uint32_t v___x_462_; lean_object* v___x_463_; 
v___x_462_ = 46;
v___x_463_ = lean_box_uint32(v___x_462_);
return v___x_463_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars(lean_object* v_x_464_){
_start:
{
if (lean_obj_tag(v_x_464_) == 0)
{
lean_object* v___x_465_; 
v___x_465_ = lean_box(0);
return v___x_465_;
}
else
{
lean_object* v_val_466_; lean_object* v___x_467_; lean_object* v___x_468_; lean_object* v___x_469_; 
v_val_466_ = lean_ctor_get(v_x_464_, 0);
lean_inc(v_val_466_);
lean_dec_ref_known(v_x_464_, 1);
v___x_467_ = lp_algalVerification_Algal_Core_DecimalSyntax_Digits_chars(v_val_466_);
v___x_468_ = lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars___boxed__const__1;
v___x_469_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_469_, 0, v___x_468_);
lean_ctor_set(v___x_469_, 1, v___x_467_);
return v___x_469_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_exponentChars(lean_object* v_x_470_){
_start:
{
if (lean_obj_tag(v_x_470_) == 0)
{
lean_object* v___x_471_; 
v___x_471_ = lean_box(0);
return v___x_471_;
}
else
{
lean_object* v_val_472_; lean_object* v___x_473_; 
v_val_472_ = lean_ctor_get(v_x_470_, 0);
lean_inc(v_val_472_);
lean_dec_ref_known(v_x_470_, 1);
v___x_473_ = lp_algalVerification_Algal_Core_DecimalSyntax_ExponentPart_chars(v_val_472_);
return v___x_473_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readFraction(lean_object* v_x_474_){
_start:
{
lean_object* v_rest_476_; 
if (lean_obj_tag(v_x_474_) == 1)
{
lean_object* v_head_480_; lean_object* v_tail_481_; uint32_t v___x_482_; uint32_t v___x_483_; uint8_t v___x_484_; 
v_head_480_ = lean_ctor_get(v_x_474_, 0);
v_tail_481_ = lean_ctor_get(v_x_474_, 1);
v___x_482_ = 46;
v___x_483_ = lean_unbox_uint32(v_head_480_);
v___x_484_ = lean_uint32_dec_eq(v___x_483_, v___x_482_);
if (v___x_484_ == 0)
{
v_rest_476_ = v_x_474_;
goto v___jp_475_;
}
else
{
lean_object* v___x_485_; 
lean_inc(v_tail_481_);
lean_dec_ref_known(v_x_474_, 2);
v___x_485_ = lp_algalVerification_Algal_Core_DecimalSyntax_readDigits(v_tail_481_);
if (lean_obj_tag(v___x_485_) == 0)
{
lean_object* v___x_486_; 
v___x_486_ = lean_box(0);
return v___x_486_;
}
else
{
lean_object* v_val_487_; lean_object* v___x_489_; uint8_t v_isShared_490_; uint8_t v_isSharedCheck_504_; 
v_val_487_ = lean_ctor_get(v___x_485_, 0);
v_isSharedCheck_504_ = !lean_is_exclusive(v___x_485_);
if (v_isSharedCheck_504_ == 0)
{
v___x_489_ = v___x_485_;
v_isShared_490_ = v_isSharedCheck_504_;
goto v_resetjp_488_;
}
else
{
lean_inc(v_val_487_);
lean_dec(v___x_485_);
v___x_489_ = lean_box(0);
v_isShared_490_ = v_isSharedCheck_504_;
goto v_resetjp_488_;
}
v_resetjp_488_:
{
lean_object* v_fst_491_; lean_object* v_snd_492_; lean_object* v___x_494_; uint8_t v_isShared_495_; uint8_t v_isSharedCheck_503_; 
v_fst_491_ = lean_ctor_get(v_val_487_, 0);
v_snd_492_ = lean_ctor_get(v_val_487_, 1);
v_isSharedCheck_503_ = !lean_is_exclusive(v_val_487_);
if (v_isSharedCheck_503_ == 0)
{
v___x_494_ = v_val_487_;
v_isShared_495_ = v_isSharedCheck_503_;
goto v_resetjp_493_;
}
else
{
lean_inc(v_snd_492_);
lean_inc(v_fst_491_);
lean_dec(v_val_487_);
v___x_494_ = lean_box(0);
v_isShared_495_ = v_isSharedCheck_503_;
goto v_resetjp_493_;
}
v_resetjp_493_:
{
lean_object* v___x_497_; 
if (v_isShared_490_ == 0)
{
lean_ctor_set(v___x_489_, 0, v_fst_491_);
v___x_497_ = v___x_489_;
goto v_reusejp_496_;
}
else
{
lean_object* v_reuseFailAlloc_502_; 
v_reuseFailAlloc_502_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_502_, 0, v_fst_491_);
v___x_497_ = v_reuseFailAlloc_502_;
goto v_reusejp_496_;
}
v_reusejp_496_:
{
lean_object* v___x_499_; 
if (v_isShared_495_ == 0)
{
lean_ctor_set(v___x_494_, 0, v___x_497_);
v___x_499_ = v___x_494_;
goto v_reusejp_498_;
}
else
{
lean_object* v_reuseFailAlloc_501_; 
v_reuseFailAlloc_501_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_501_, 0, v___x_497_);
lean_ctor_set(v_reuseFailAlloc_501_, 1, v_snd_492_);
v___x_499_ = v_reuseFailAlloc_501_;
goto v_reusejp_498_;
}
v_reusejp_498_:
{
lean_object* v___x_500_; 
v___x_500_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_500_, 0, v___x_499_);
return v___x_500_;
}
}
}
}
}
}
}
else
{
v_rest_476_ = v_x_474_;
goto v___jp_475_;
}
v___jp_475_:
{
lean_object* v___x_477_; lean_object* v___x_478_; lean_object* v___x_479_; 
v___x_477_ = lean_box(0);
v___x_478_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_478_, 0, v___x_477_);
lean_ctor_set(v___x_478_, 1, v_rest_476_);
v___x_479_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_479_, 0, v___x_478_);
return v___x_479_;
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral_decEq(lean_object* v_x_505_, lean_object* v_x_506_){
_start:
{
uint8_t v_negative_507_; lean_object* v_integer_508_; lean_object* v_fraction_509_; lean_object* v_exponent_510_; uint8_t v_negative_511_; lean_object* v_integer_512_; lean_object* v_fraction_513_; lean_object* v_exponent_514_; 
v_negative_507_ = lean_ctor_get_uint8(v_x_505_, sizeof(void*)*3);
v_integer_508_ = lean_ctor_get(v_x_505_, 0);
lean_inc_ref(v_integer_508_);
v_fraction_509_ = lean_ctor_get(v_x_505_, 1);
lean_inc(v_fraction_509_);
v_exponent_510_ = lean_ctor_get(v_x_505_, 2);
lean_inc(v_exponent_510_);
lean_dec_ref(v_x_505_);
v_negative_511_ = lean_ctor_get_uint8(v_x_506_, sizeof(void*)*3);
v_integer_512_ = lean_ctor_get(v_x_506_, 0);
lean_inc_ref(v_integer_512_);
v_fraction_513_ = lean_ctor_get(v_x_506_, 1);
lean_inc(v_fraction_513_);
v_exponent_514_ = lean_ctor_get(v_x_506_, 2);
lean_inc(v_exponent_514_);
lean_dec_ref(v_x_506_);
if (v_negative_507_ == 0)
{
if (v_negative_511_ == 0)
{
goto v___jp_515_;
}
else
{
lean_dec(v_exponent_514_);
lean_dec(v_fraction_513_);
lean_dec_ref(v_integer_512_);
lean_dec(v_exponent_510_);
lean_dec(v_fraction_509_);
lean_dec_ref(v_integer_508_);
return v_negative_507_;
}
}
else
{
if (v_negative_511_ == 0)
{
lean_dec(v_exponent_514_);
lean_dec(v_fraction_513_);
lean_dec_ref(v_integer_512_);
lean_dec(v_exponent_510_);
lean_dec(v_fraction_509_);
lean_dec_ref(v_integer_508_);
return v_negative_511_;
}
else
{
goto v___jp_515_;
}
}
v___jp_515_:
{
uint8_t v___x_516_; 
v___x_516_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits_decEq(v_integer_508_, v_integer_512_);
if (v___x_516_ == 0)
{
lean_dec(v_exponent_514_);
lean_dec(v_fraction_513_);
lean_dec(v_exponent_510_);
lean_dec(v_fraction_509_);
return v___x_516_;
}
else
{
lean_object* v___x_517_; uint8_t v___x_518_; 
v___x_517_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqDigits___boxed), 2, 0);
v___x_518_ = l_Option_instDecidableEq___redArg(v___x_517_, v_fraction_509_, v_fraction_513_);
if (v___x_518_ == 0)
{
lean_dec(v_exponent_514_);
lean_dec(v_exponent_510_);
return v___x_518_;
}
else
{
lean_object* v___x_519_; uint8_t v___x_520_; 
v___x_519_ = lean_alloc_closure((void*)(lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqExponentPart___boxed), 2, 0);
v___x_520_ = l_Option_instDecidableEq___redArg(v___x_519_, v_exponent_510_, v_exponent_514_);
return v___x_520_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral_decEq___boxed(lean_object* v_x_521_, lean_object* v_x_522_){
_start:
{
uint8_t v_res_523_; lean_object* v_r_524_; 
v_res_523_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral_decEq(v_x_521_, v_x_522_);
v_r_524_ = lean_box(v_res_523_);
return v_r_524_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral(lean_object* v_x_525_, lean_object* v_x_526_){
_start:
{
uint8_t v___x_527_; 
v___x_527_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral_decEq(v_x_525_, v_x_526_);
return v___x_527_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral___boxed(lean_object* v_x_528_, lean_object* v_x_529_){
_start:
{
uint8_t v_res_530_; lean_object* v_r_531_; 
v_res_530_ = lp_algalVerification_Algal_Core_DecimalSyntax_instDecidableEqNumeral(v_x_528_, v_x_529_);
v_r_531_ = lean_box(v_res_530_);
return v_r_531_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_renderUnsigned(lean_object* v_n_532_){
_start:
{
lean_object* v_integer_533_; lean_object* v_fraction_534_; lean_object* v_exponent_535_; lean_object* v___x_536_; lean_object* v___x_537_; lean_object* v___x_538_; lean_object* v___x_539_; lean_object* v___x_540_; 
v_integer_533_ = lean_ctor_get(v_n_532_, 0);
lean_inc_ref(v_integer_533_);
v_fraction_534_ = lean_ctor_get(v_n_532_, 1);
lean_inc(v_fraction_534_);
v_exponent_535_ = lean_ctor_get(v_n_532_, 2);
lean_inc(v_exponent_535_);
lean_dec_ref(v_n_532_);
v___x_536_ = lp_algalVerification_Algal_Core_DecimalSyntax_Digits_chars(v_integer_533_);
v___x_537_ = lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars(v_fraction_534_);
v___x_538_ = l_List_appendTR___redArg(v___x_536_, v___x_537_);
v___x_539_ = lp_algalVerification_Algal_Core_DecimalSyntax_exponentChars(v_exponent_535_);
v___x_540_ = l_List_appendTR___redArg(v___x_538_, v___x_539_);
return v___x_540_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_render(lean_object* v_n_541_){
_start:
{
lean_object* v___y_543_; uint8_t v_negative_546_; 
v_negative_546_ = lean_ctor_get_uint8(v_n_541_, sizeof(void*)*3);
if (v_negative_546_ == 0)
{
lean_object* v___x_547_; 
v___x_547_ = lean_box(0);
v___y_543_ = v___x_547_;
goto v___jp_542_;
}
else
{
lean_object* v___x_548_; 
v___x_548_ = lean_obj_once(&lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1, &lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1_once, _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1);
v___y_543_ = v___x_548_;
goto v___jp_542_;
}
v___jp_542_:
{
lean_object* v___x_544_; lean_object* v___x_545_; 
v___x_544_ = lp_algalVerification_Algal_Core_DecimalSyntax_renderUnsigned(v_n_541_);
lean_inc(v___y_543_);
v___x_545_ = l_List_appendTR___redArg(v___y_543_, v___x_544_);
return v___x_545_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readUnsigned(uint8_t v_negative_549_, lean_object* v_input_550_){
_start:
{
lean_object* v___x_551_; 
v___x_551_ = lp_algalVerification_Algal_Core_DecimalSyntax_readInteger(v_input_550_);
if (lean_obj_tag(v___x_551_) == 0)
{
lean_object* v___x_552_; 
v___x_552_ = lean_box(0);
return v___x_552_;
}
else
{
lean_object* v_val_553_; lean_object* v_fst_554_; lean_object* v_snd_555_; lean_object* v___x_556_; 
v_val_553_ = lean_ctor_get(v___x_551_, 0);
lean_inc(v_val_553_);
lean_dec_ref_known(v___x_551_, 1);
v_fst_554_ = lean_ctor_get(v_val_553_, 0);
lean_inc(v_fst_554_);
v_snd_555_ = lean_ctor_get(v_val_553_, 1);
lean_inc(v_snd_555_);
lean_dec(v_val_553_);
v___x_556_ = lp_algalVerification_Algal_Core_DecimalSyntax_readFraction(v_snd_555_);
if (lean_obj_tag(v___x_556_) == 0)
{
lean_object* v___x_557_; 
lean_dec(v_fst_554_);
v___x_557_ = lean_box(0);
return v___x_557_;
}
else
{
lean_object* v_val_558_; lean_object* v_fst_559_; lean_object* v_snd_560_; lean_object* v___x_561_; 
v_val_558_ = lean_ctor_get(v___x_556_, 0);
lean_inc(v_val_558_);
lean_dec_ref_known(v___x_556_, 1);
v_fst_559_ = lean_ctor_get(v_val_558_, 0);
lean_inc(v_fst_559_);
v_snd_560_ = lean_ctor_get(v_val_558_, 1);
lean_inc(v_snd_560_);
lean_dec(v_val_558_);
v___x_561_ = lp_algalVerification_Algal_Core_DecimalSyntax_readExponent(v_snd_560_);
if (lean_obj_tag(v___x_561_) == 0)
{
lean_object* v___x_562_; 
lean_dec(v_fst_559_);
lean_dec(v_fst_554_);
v___x_562_ = lean_box(0);
return v___x_562_;
}
else
{
lean_object* v_val_563_; lean_object* v___x_565_; uint8_t v_isShared_566_; uint8_t v_isSharedCheck_580_; 
v_val_563_ = lean_ctor_get(v___x_561_, 0);
v_isSharedCheck_580_ = !lean_is_exclusive(v___x_561_);
if (v_isSharedCheck_580_ == 0)
{
v___x_565_ = v___x_561_;
v_isShared_566_ = v_isSharedCheck_580_;
goto v_resetjp_564_;
}
else
{
lean_inc(v_val_563_);
lean_dec(v___x_561_);
v___x_565_ = lean_box(0);
v_isShared_566_ = v_isSharedCheck_580_;
goto v_resetjp_564_;
}
v_resetjp_564_:
{
lean_object* v_fst_567_; lean_object* v_snd_568_; lean_object* v___x_570_; uint8_t v_isShared_571_; uint8_t v_isSharedCheck_579_; 
v_fst_567_ = lean_ctor_get(v_val_563_, 0);
v_snd_568_ = lean_ctor_get(v_val_563_, 1);
v_isSharedCheck_579_ = !lean_is_exclusive(v_val_563_);
if (v_isSharedCheck_579_ == 0)
{
v___x_570_ = v_val_563_;
v_isShared_571_ = v_isSharedCheck_579_;
goto v_resetjp_569_;
}
else
{
lean_inc(v_snd_568_);
lean_inc(v_fst_567_);
lean_dec(v_val_563_);
v___x_570_ = lean_box(0);
v_isShared_571_ = v_isSharedCheck_579_;
goto v_resetjp_569_;
}
v_resetjp_569_:
{
lean_object* v___x_572_; lean_object* v___x_574_; 
v___x_572_ = lean_alloc_ctor(0, 3, 1);
lean_ctor_set(v___x_572_, 0, v_fst_554_);
lean_ctor_set(v___x_572_, 1, v_fst_559_);
lean_ctor_set(v___x_572_, 2, v_fst_567_);
lean_ctor_set_uint8(v___x_572_, sizeof(void*)*3, v_negative_549_);
if (v_isShared_571_ == 0)
{
lean_ctor_set(v___x_570_, 0, v___x_572_);
v___x_574_ = v___x_570_;
goto v_reusejp_573_;
}
else
{
lean_object* v_reuseFailAlloc_578_; 
v_reuseFailAlloc_578_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_578_, 0, v___x_572_);
lean_ctor_set(v_reuseFailAlloc_578_, 1, v_snd_568_);
v___x_574_ = v_reuseFailAlloc_578_;
goto v_reusejp_573_;
}
v_reusejp_573_:
{
lean_object* v___x_576_; 
if (v_isShared_566_ == 0)
{
lean_ctor_set(v___x_565_, 0, v___x_574_);
v___x_576_ = v___x_565_;
goto v_reusejp_575_;
}
else
{
lean_object* v_reuseFailAlloc_577_; 
v_reuseFailAlloc_577_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_577_, 0, v___x_574_);
v___x_576_ = v_reuseFailAlloc_577_;
goto v_reusejp_575_;
}
v_reusejp_575_:
{
return v___x_576_;
}
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readUnsigned___boxed(lean_object* v_negative_581_, lean_object* v_input_582_){
_start:
{
uint8_t v_negative_boxed_583_; lean_object* v_res_584_; 
v_negative_boxed_583_ = lean_unbox(v_negative_581_);
v_res_584_ = lp_algalVerification_Algal_Core_DecimalSyntax_readUnsigned(v_negative_boxed_583_, v_input_582_);
return v_res_584_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readPrefix(lean_object* v_x_585_){
_start:
{
lean_object* v_rest_587_; 
if (lean_obj_tag(v_x_585_) == 1)
{
lean_object* v_head_590_; lean_object* v_tail_591_; uint32_t v___x_592_; uint32_t v___x_593_; uint8_t v___x_594_; 
v_head_590_ = lean_ctor_get(v_x_585_, 0);
v_tail_591_ = lean_ctor_get(v_x_585_, 1);
v___x_592_ = 45;
v___x_593_ = lean_unbox_uint32(v_head_590_);
v___x_594_ = lean_uint32_dec_eq(v___x_593_, v___x_592_);
if (v___x_594_ == 0)
{
v_rest_587_ = v_x_585_;
goto v___jp_586_;
}
else
{
lean_object* v___x_595_; 
lean_inc(v_tail_591_);
lean_dec_ref_known(v_x_585_, 2);
v___x_595_ = lp_algalVerification_Algal_Core_DecimalSyntax_readUnsigned(v___x_594_, v_tail_591_);
return v___x_595_;
}
}
else
{
v_rest_587_ = v_x_585_;
goto v___jp_586_;
}
v___jp_586_:
{
uint8_t v___x_588_; lean_object* v___x_589_; 
v___x_588_ = 0;
v___x_589_ = lp_algalVerification_Algal_Core_DecimalSyntax_readUnsigned(v___x_588_, v_rest_587_);
return v___x_589_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_readWhole(lean_object* v_input_596_){
_start:
{
lean_object* v___x_597_; 
v___x_597_ = lp_algalVerification_Algal_Core_DecimalSyntax_readPrefix(v_input_596_);
if (lean_obj_tag(v___x_597_) == 0)
{
lean_object* v___x_598_; 
v___x_598_ = lean_box(0);
return v___x_598_;
}
else
{
lean_object* v_val_599_; lean_object* v___x_601_; uint8_t v_isShared_602_; uint8_t v_isSharedCheck_610_; 
v_val_599_ = lean_ctor_get(v___x_597_, 0);
v_isSharedCheck_610_ = !lean_is_exclusive(v___x_597_);
if (v_isSharedCheck_610_ == 0)
{
v___x_601_ = v___x_597_;
v_isShared_602_ = v_isSharedCheck_610_;
goto v_resetjp_600_;
}
else
{
lean_inc(v_val_599_);
lean_dec(v___x_597_);
v___x_601_ = lean_box(0);
v_isShared_602_ = v_isSharedCheck_610_;
goto v_resetjp_600_;
}
v_resetjp_600_:
{
lean_object* v_fst_603_; lean_object* v_snd_604_; uint8_t v___x_605_; 
v_fst_603_ = lean_ctor_get(v_val_599_, 0);
lean_inc(v_fst_603_);
v_snd_604_ = lean_ctor_get(v_val_599_, 1);
lean_inc(v_snd_604_);
lean_dec(v_val_599_);
v___x_605_ = l_List_instDecidableEqNil___redArg(v_snd_604_);
lean_dec(v_snd_604_);
if (v___x_605_ == 0)
{
lean_object* v___x_606_; 
lean_dec(v_fst_603_);
lean_del_object(v___x_601_);
v___x_606_ = lean_box(0);
return v___x_606_;
}
else
{
lean_object* v___x_608_; 
if (v_isShared_602_ == 0)
{
lean_ctor_set(v___x_601_, 0, v_fst_603_);
v___x_608_ = v___x_601_;
goto v_reusejp_607_;
}
else
{
lean_object* v_reuseFailAlloc_609_; 
v_reuseFailAlloc_609_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_609_, 0, v_fst_603_);
v___x_608_ = v_reuseFailAlloc_609_;
goto v_reusejp_607_;
}
v_reusejp_607_:
{
return v___x_608_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readExponentSign_match__1_splitter___redArg(lean_object* v_x_611_, lean_object* v_h__1_612_, lean_object* v_h__2_613_, lean_object* v_h__3_614_){
_start:
{
if (lean_obj_tag(v_x_611_) == 1)
{
lean_object* v_head_615_; lean_object* v_tail_616_; uint32_t v___x_617_; uint32_t v___x_618_; uint8_t v___x_619_; 
v_head_615_ = lean_ctor_get(v_x_611_, 0);
v_tail_616_ = lean_ctor_get(v_x_611_, 1);
v___x_617_ = 43;
v___x_618_ = lean_unbox_uint32(v_head_615_);
v___x_619_ = lean_uint32_dec_eq(v___x_618_, v___x_617_);
if (v___x_619_ == 0)
{
uint32_t v___x_620_; uint32_t v___x_621_; uint8_t v___x_622_; 
lean_dec(v_h__1_612_);
v___x_620_ = 45;
v___x_621_ = lean_unbox_uint32(v_head_615_);
v___x_622_ = lean_uint32_dec_eq(v___x_621_, v___x_620_);
if (v___x_622_ == 0)
{
lean_object* v___x_623_; 
lean_dec(v_h__2_613_);
v___x_623_ = lean_apply_3(v_h__3_614_, v_x_611_, lean_box(0), lean_box(0));
return v___x_623_;
}
else
{
lean_object* v___x_624_; 
lean_inc(v_tail_616_);
lean_dec_ref_known(v_x_611_, 2);
lean_dec(v_h__3_614_);
v___x_624_ = lean_apply_1(v_h__2_613_, v_tail_616_);
return v___x_624_;
}
}
else
{
lean_object* v___x_625_; 
lean_inc(v_tail_616_);
lean_dec_ref_known(v_x_611_, 2);
lean_dec(v_h__3_614_);
lean_dec(v_h__2_613_);
v___x_625_ = lean_apply_1(v_h__1_612_, v_tail_616_);
return v___x_625_;
}
}
else
{
lean_object* v___x_626_; 
lean_dec(v_h__2_613_);
lean_dec(v_h__1_612_);
v___x_626_ = lean_apply_3(v_h__3_614_, v_x_611_, lean_box(0), lean_box(0));
return v___x_626_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readExponentSign_match__1_splitter(lean_object* v_motive_627_, lean_object* v_x_628_, lean_object* v_h__1_629_, lean_object* v_h__2_630_, lean_object* v_h__3_631_){
_start:
{
if (lean_obj_tag(v_x_628_) == 1)
{
lean_object* v_head_632_; lean_object* v_tail_633_; uint32_t v___x_634_; uint32_t v___x_635_; uint8_t v___x_636_; 
v_head_632_ = lean_ctor_get(v_x_628_, 0);
v_tail_633_ = lean_ctor_get(v_x_628_, 1);
v___x_634_ = 43;
v___x_635_ = lean_unbox_uint32(v_head_632_);
v___x_636_ = lean_uint32_dec_eq(v___x_635_, v___x_634_);
if (v___x_636_ == 0)
{
uint32_t v___x_637_; uint32_t v___x_638_; uint8_t v___x_639_; 
lean_dec(v_h__1_629_);
v___x_637_ = 45;
v___x_638_ = lean_unbox_uint32(v_head_632_);
v___x_639_ = lean_uint32_dec_eq(v___x_638_, v___x_637_);
if (v___x_639_ == 0)
{
lean_object* v___x_640_; 
lean_dec(v_h__2_630_);
v___x_640_ = lean_apply_3(v_h__3_631_, v_x_628_, lean_box(0), lean_box(0));
return v___x_640_;
}
else
{
lean_object* v___x_641_; 
lean_inc(v_tail_633_);
lean_dec_ref_known(v_x_628_, 2);
lean_dec(v_h__3_631_);
v___x_641_ = lean_apply_1(v_h__2_630_, v_tail_633_);
return v___x_641_;
}
}
else
{
lean_object* v___x_642_; 
lean_inc(v_tail_633_);
lean_dec_ref_known(v_x_628_, 2);
lean_dec(v_h__3_631_);
lean_dec(v_h__2_630_);
v___x_642_ = lean_apply_1(v_h__1_629_, v_tail_633_);
return v___x_642_;
}
}
else
{
lean_object* v___x_643_; 
lean_dec(v_h__2_630_);
lean_dec(v_h__1_629_);
v___x_643_ = lean_apply_3(v_h__3_631_, v_x_628_, lean_box(0), lean_box(0));
return v___x_643_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_exponentChars_match__1_splitter___redArg(lean_object* v_x_644_, lean_object* v_h__1_645_, lean_object* v_h__2_646_){
_start:
{
if (lean_obj_tag(v_x_644_) == 0)
{
lean_object* v___x_647_; lean_object* v___x_648_; 
lean_dec(v_h__2_646_);
v___x_647_ = lean_box(0);
v___x_648_ = lean_apply_1(v_h__1_645_, v___x_647_);
return v___x_648_;
}
else
{
lean_object* v_val_649_; lean_object* v___x_650_; 
lean_dec(v_h__1_645_);
v_val_649_ = lean_ctor_get(v_x_644_, 0);
lean_inc(v_val_649_);
lean_dec_ref_known(v_x_644_, 1);
v___x_650_ = lean_apply_1(v_h__2_646_, v_val_649_);
return v___x_650_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_exponentChars_match__1_splitter(lean_object* v_motive_651_, lean_object* v_x_652_, lean_object* v_h__1_653_, lean_object* v_h__2_654_){
_start:
{
if (lean_obj_tag(v_x_652_) == 0)
{
lean_object* v___x_655_; lean_object* v___x_656_; 
lean_dec(v_h__2_654_);
v___x_655_ = lean_box(0);
v___x_656_ = lean_apply_1(v_h__1_653_, v___x_655_);
return v___x_656_;
}
else
{
lean_object* v_val_657_; lean_object* v___x_658_; 
lean_dec(v_h__1_653_);
v_val_657_ = lean_ctor_get(v_x_652_, 0);
lean_inc(v_val_657_);
lean_dec_ref_known(v_x_652_, 1);
v___x_658_ = lean_apply_1(v_h__2_654_, v_val_657_);
return v___x_658_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readExponent_match__3_splitter___redArg(lean_object* v_x_659_, lean_object* v_h__1_660_, lean_object* v_h__2_661_, lean_object* v_h__3_662_){
_start:
{
if (lean_obj_tag(v_x_659_) == 1)
{
lean_object* v_head_663_; lean_object* v_tail_664_; uint32_t v___x_665_; uint32_t v___x_666_; uint8_t v___x_667_; 
v_head_663_ = lean_ctor_get(v_x_659_, 0);
v_tail_664_ = lean_ctor_get(v_x_659_, 1);
v___x_665_ = 101;
v___x_666_ = lean_unbox_uint32(v_head_663_);
v___x_667_ = lean_uint32_dec_eq(v___x_666_, v___x_665_);
if (v___x_667_ == 0)
{
uint32_t v___x_668_; uint32_t v___x_669_; uint8_t v___x_670_; 
lean_dec(v_h__1_660_);
v___x_668_ = 69;
v___x_669_ = lean_unbox_uint32(v_head_663_);
v___x_670_ = lean_uint32_dec_eq(v___x_669_, v___x_668_);
if (v___x_670_ == 0)
{
lean_object* v___x_671_; 
lean_dec(v_h__2_661_);
v___x_671_ = lean_apply_3(v_h__3_662_, v_x_659_, lean_box(0), lean_box(0));
return v___x_671_;
}
else
{
lean_object* v___x_672_; 
lean_inc(v_tail_664_);
lean_dec_ref_known(v_x_659_, 2);
lean_dec(v_h__3_662_);
v___x_672_ = lean_apply_1(v_h__2_661_, v_tail_664_);
return v___x_672_;
}
}
else
{
lean_object* v___x_673_; 
lean_inc(v_tail_664_);
lean_dec_ref_known(v_x_659_, 2);
lean_dec(v_h__3_662_);
lean_dec(v_h__2_661_);
v___x_673_ = lean_apply_1(v_h__1_660_, v_tail_664_);
return v___x_673_;
}
}
else
{
lean_object* v___x_674_; 
lean_dec(v_h__2_661_);
lean_dec(v_h__1_660_);
v___x_674_ = lean_apply_3(v_h__3_662_, v_x_659_, lean_box(0), lean_box(0));
return v___x_674_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readExponent_match__3_splitter(lean_object* v_motive_675_, lean_object* v_x_676_, lean_object* v_h__1_677_, lean_object* v_h__2_678_, lean_object* v_h__3_679_){
_start:
{
if (lean_obj_tag(v_x_676_) == 1)
{
lean_object* v_head_680_; lean_object* v_tail_681_; uint32_t v___x_682_; uint32_t v___x_683_; uint8_t v___x_684_; 
v_head_680_ = lean_ctor_get(v_x_676_, 0);
v_tail_681_ = lean_ctor_get(v_x_676_, 1);
v___x_682_ = 101;
v___x_683_ = lean_unbox_uint32(v_head_680_);
v___x_684_ = lean_uint32_dec_eq(v___x_683_, v___x_682_);
if (v___x_684_ == 0)
{
uint32_t v___x_685_; uint32_t v___x_686_; uint8_t v___x_687_; 
lean_dec(v_h__1_677_);
v___x_685_ = 69;
v___x_686_ = lean_unbox_uint32(v_head_680_);
v___x_687_ = lean_uint32_dec_eq(v___x_686_, v___x_685_);
if (v___x_687_ == 0)
{
lean_object* v___x_688_; 
lean_dec(v_h__2_678_);
v___x_688_ = lean_apply_3(v_h__3_679_, v_x_676_, lean_box(0), lean_box(0));
return v___x_688_;
}
else
{
lean_object* v___x_689_; 
lean_inc(v_tail_681_);
lean_dec_ref_known(v_x_676_, 2);
lean_dec(v_h__3_679_);
v___x_689_ = lean_apply_1(v_h__2_678_, v_tail_681_);
return v___x_689_;
}
}
else
{
lean_object* v___x_690_; 
lean_inc(v_tail_681_);
lean_dec_ref_known(v_x_676_, 2);
lean_dec(v_h__3_679_);
lean_dec(v_h__2_678_);
v___x_690_ = lean_apply_1(v_h__1_677_, v_tail_681_);
return v___x_690_;
}
}
else
{
lean_object* v___x_691_; 
lean_dec(v_h__2_678_);
lean_dec(v_h__1_677_);
v___x_691_ = lean_apply_3(v_h__3_679_, v_x_676_, lean_box(0), lean_box(0));
return v___x_691_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readFraction_match__1_splitter___redArg(lean_object* v_x_692_, lean_object* v_h__1_693_, lean_object* v_h__2_694_){
_start:
{
if (lean_obj_tag(v_x_692_) == 1)
{
lean_object* v_head_695_; lean_object* v_tail_696_; uint32_t v___x_697_; uint32_t v___x_698_; uint8_t v___x_699_; 
v_head_695_ = lean_ctor_get(v_x_692_, 0);
v_tail_696_ = lean_ctor_get(v_x_692_, 1);
v___x_697_ = 46;
v___x_698_ = lean_unbox_uint32(v_head_695_);
v___x_699_ = lean_uint32_dec_eq(v___x_698_, v___x_697_);
if (v___x_699_ == 0)
{
lean_object* v___x_700_; 
lean_dec(v_h__1_693_);
v___x_700_ = lean_apply_2(v_h__2_694_, v_x_692_, lean_box(0));
return v___x_700_;
}
else
{
lean_object* v___x_701_; 
lean_inc(v_tail_696_);
lean_dec_ref_known(v_x_692_, 2);
lean_dec(v_h__2_694_);
v___x_701_ = lean_apply_1(v_h__1_693_, v_tail_696_);
return v___x_701_;
}
}
else
{
lean_object* v___x_702_; 
lean_dec(v_h__1_693_);
v___x_702_ = lean_apply_2(v_h__2_694_, v_x_692_, lean_box(0));
return v___x_702_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readFraction_match__1_splitter(lean_object* v_motive_703_, lean_object* v_x_704_, lean_object* v_h__1_705_, lean_object* v_h__2_706_){
_start:
{
if (lean_obj_tag(v_x_704_) == 1)
{
lean_object* v_head_707_; lean_object* v_tail_708_; uint32_t v___x_709_; uint32_t v___x_710_; uint8_t v___x_711_; 
v_head_707_ = lean_ctor_get(v_x_704_, 0);
v_tail_708_ = lean_ctor_get(v_x_704_, 1);
v___x_709_ = 46;
v___x_710_ = lean_unbox_uint32(v_head_707_);
v___x_711_ = lean_uint32_dec_eq(v___x_710_, v___x_709_);
if (v___x_711_ == 0)
{
lean_object* v___x_712_; 
lean_dec(v_h__1_705_);
v___x_712_ = lean_apply_2(v_h__2_706_, v_x_704_, lean_box(0));
return v___x_712_;
}
else
{
lean_object* v___x_713_; 
lean_inc(v_tail_708_);
lean_dec_ref_known(v_x_704_, 2);
lean_dec(v_h__2_706_);
v___x_713_ = lean_apply_1(v_h__1_705_, v_tail_708_);
return v___x_713_;
}
}
else
{
lean_object* v___x_714_; 
lean_dec(v_h__1_705_);
v___x_714_ = lean_apply_2(v_h__2_706_, v_x_704_, lean_box(0));
return v___x_714_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_fractionChars_match__1_splitter___redArg(lean_object* v_x_715_, lean_object* v_h__1_716_, lean_object* v_h__2_717_){
_start:
{
if (lean_obj_tag(v_x_715_) == 0)
{
lean_object* v___x_718_; lean_object* v___x_719_; 
lean_dec(v_h__2_717_);
v___x_718_ = lean_box(0);
v___x_719_ = lean_apply_1(v_h__1_716_, v___x_718_);
return v___x_719_;
}
else
{
lean_object* v_val_720_; lean_object* v___x_721_; 
lean_dec(v_h__1_716_);
v_val_720_ = lean_ctor_get(v_x_715_, 0);
lean_inc(v_val_720_);
lean_dec_ref_known(v_x_715_, 1);
v___x_721_ = lean_apply_1(v_h__2_717_, v_val_720_);
return v___x_721_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_fractionChars_match__1_splitter(lean_object* v_motive_722_, lean_object* v_x_723_, lean_object* v_h__1_724_, lean_object* v_h__2_725_){
_start:
{
if (lean_obj_tag(v_x_723_) == 0)
{
lean_object* v___x_726_; lean_object* v___x_727_; 
lean_dec(v_h__2_725_);
v___x_726_ = lean_box(0);
v___x_727_ = lean_apply_1(v_h__1_724_, v___x_726_);
return v___x_727_;
}
else
{
lean_object* v_val_728_; lean_object* v___x_729_; 
lean_dec(v_h__1_724_);
v_val_728_ = lean_ctor_get(v_x_723_, 0);
lean_inc(v_val_728_);
lean_dec_ref_known(v_x_723_, 1);
v___x_729_ = lean_apply_1(v_h__2_725_, v_val_728_);
return v___x_729_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Option_bind_match__1_splitter___redArg(lean_object* v_x_730_, lean_object* v_x_731_, lean_object* v_h__1_732_, lean_object* v_h__2_733_){
_start:
{
if (lean_obj_tag(v_x_730_) == 0)
{
lean_object* v___x_734_; 
lean_dec(v_h__2_733_);
v___x_734_ = lean_apply_1(v_h__1_732_, v_x_731_);
return v___x_734_;
}
else
{
lean_object* v_val_735_; lean_object* v___x_736_; 
lean_dec(v_h__1_732_);
v_val_735_ = lean_ctor_get(v_x_730_, 0);
lean_inc(v_val_735_);
lean_dec_ref_known(v_x_730_, 1);
v___x_736_ = lean_apply_2(v_h__2_733_, v_val_735_, v_x_731_);
return v___x_736_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Option_bind_match__1_splitter(lean_object* v_00_u03b1_737_, lean_object* v_00_u03b2_738_, lean_object* v_motive_739_, lean_object* v_x_740_, lean_object* v_x_741_, lean_object* v_h__1_742_, lean_object* v_h__2_743_){
_start:
{
if (lean_obj_tag(v_x_740_) == 0)
{
lean_object* v___x_744_; 
lean_dec(v_h__2_743_);
v___x_744_ = lean_apply_1(v_h__1_742_, v_x_741_);
return v___x_744_;
}
else
{
lean_object* v_val_745_; lean_object* v___x_746_; 
lean_dec(v_h__1_742_);
v_val_745_ = lean_ctor_get(v_x_740_, 0);
lean_inc(v_val_745_);
lean_dec_ref_known(v_x_740_, 1);
v___x_746_ = lean_apply_2(v_h__2_743_, v_val_745_, v_x_741_);
return v___x_746_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readPrefix_match__1_splitter___redArg(lean_object* v_x_747_, lean_object* v_h__1_748_, lean_object* v_h__2_749_){
_start:
{
if (lean_obj_tag(v_x_747_) == 1)
{
lean_object* v_head_750_; lean_object* v_tail_751_; uint32_t v___x_752_; uint32_t v___x_753_; uint8_t v___x_754_; 
v_head_750_ = lean_ctor_get(v_x_747_, 0);
v_tail_751_ = lean_ctor_get(v_x_747_, 1);
v___x_752_ = 45;
v___x_753_ = lean_unbox_uint32(v_head_750_);
v___x_754_ = lean_uint32_dec_eq(v___x_753_, v___x_752_);
if (v___x_754_ == 0)
{
lean_object* v___x_755_; 
lean_dec(v_h__1_748_);
v___x_755_ = lean_apply_2(v_h__2_749_, v_x_747_, lean_box(0));
return v___x_755_;
}
else
{
lean_object* v___x_756_; 
lean_inc(v_tail_751_);
lean_dec_ref_known(v_x_747_, 2);
lean_dec(v_h__2_749_);
v___x_756_ = lean_apply_1(v_h__1_748_, v_tail_751_);
return v___x_756_;
}
}
else
{
lean_object* v___x_757_; 
lean_dec(v_h__1_748_);
v___x_757_ = lean_apply_2(v_h__2_749_, v_x_747_, lean_box(0));
return v___x_757_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readPrefix_match__1_splitter(lean_object* v_motive_758_, lean_object* v_x_759_, lean_object* v_h__1_760_, lean_object* v_h__2_761_){
_start:
{
if (lean_obj_tag(v_x_759_) == 1)
{
lean_object* v_head_762_; lean_object* v_tail_763_; uint32_t v___x_764_; uint32_t v___x_765_; uint8_t v___x_766_; 
v_head_762_ = lean_ctor_get(v_x_759_, 0);
v_tail_763_ = lean_ctor_get(v_x_759_, 1);
v___x_764_ = 45;
v___x_765_ = lean_unbox_uint32(v_head_762_);
v___x_766_ = lean_uint32_dec_eq(v___x_765_, v___x_764_);
if (v___x_766_ == 0)
{
lean_object* v___x_767_; 
lean_dec(v_h__1_760_);
v___x_767_ = lean_apply_2(v_h__2_761_, v_x_759_, lean_box(0));
return v___x_767_;
}
else
{
lean_object* v___x_768_; 
lean_inc(v_tail_763_);
lean_dec_ref_known(v_x_759_, 2);
lean_dec(v_h__2_761_);
v___x_768_ = lean_apply_1(v_h__1_760_, v_tail_763_);
return v___x_768_;
}
}
else
{
lean_object* v___x_769_; 
lean_dec(v_h__1_760_);
v___x_769_ = lean_apply_2(v_h__2_761_, v_x_759_, lean_box(0));
return v___x_769_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue(lean_object* v_x_770_){
_start:
{
if (lean_obj_tag(v_x_770_) == 0)
{
lean_object* v___x_771_; 
v___x_771_ = lean_unsigned_to_nat(0u);
return v___x_771_;
}
else
{
lean_object* v_head_772_; lean_object* v_tail_773_; lean_object* v___x_774_; lean_object* v___x_775_; lean_object* v___x_776_; lean_object* v___x_777_; lean_object* v___x_778_; lean_object* v___x_779_; 
v_head_772_ = lean_ctor_get(v_x_770_, 0);
v_tail_773_ = lean_ctor_get(v_x_770_, 1);
v___x_774_ = lean_unsigned_to_nat(10u);
v___x_775_ = l_List_lengthTR___redArg(v_tail_773_);
v___x_776_ = lean_nat_pow(v___x_774_, v___x_775_);
lean_dec(v___x_775_);
v___x_777_ = lean_nat_mul(v_head_772_, v___x_776_);
lean_dec(v___x_776_);
v___x_778_ = lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue(v_tail_773_);
v___x_779_ = lean_nat_add(v___x_777_, v___x_778_);
lean_dec(v___x_778_);
lean_dec(v___x_777_);
return v___x_779_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue___boxed(lean_object* v_x_780_){
_start:
{
lean_object* v_res_781_; 
v_res_781_ = lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue(v_x_780_);
lean_dec(v_x_780_);
return v_res_781_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_fractionDigits(lean_object* v_n_782_){
_start:
{
lean_object* v_fraction_783_; 
v_fraction_783_ = lean_ctor_get(v_n_782_, 1);
lean_inc(v_fraction_783_);
lean_dec_ref(v_n_782_);
if (lean_obj_tag(v_fraction_783_) == 0)
{
lean_object* v___x_784_; 
v___x_784_ = lean_box(0);
return v___x_784_;
}
else
{
lean_object* v_val_785_; lean_object* v___x_786_; 
v_val_785_ = lean_ctor_get(v_fraction_783_, 0);
lean_inc(v_val_785_);
lean_dec_ref_known(v_fraction_783_, 1);
v___x_786_ = lp_algalVerification_Algal_Core_DecimalSyntax_Digits_list(v_val_785_);
return v___x_786_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_coefficient(lean_object* v_n_787_){
_start:
{
lean_object* v_integer_788_; lean_object* v___x_789_; lean_object* v___x_790_; lean_object* v___x_791_; lean_object* v___x_792_; 
v_integer_788_ = lean_ctor_get(v_n_787_, 0);
lean_inc_ref(v_integer_788_);
v___x_789_ = lp_algalVerification_Algal_Core_DecimalSyntax_Digits_list(v_integer_788_);
v___x_790_ = lp_algalVerification_Algal_Core_DecimalSyntax_fractionDigits(v_n_787_);
v___x_791_ = l_List_appendTR___redArg(v___x_789_, v___x_790_);
v___x_792_ = lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue(v___x_791_);
lean_dec(v___x_791_);
return v___x_792_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue___closed__0(void){
_start:
{
lean_object* v___x_793_; lean_object* v___x_794_; 
v___x_793_ = lean_unsigned_to_nat(0u);
v___x_794_ = lean_nat_to_int(v___x_793_);
return v___x_794_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue(lean_object* v_x_795_){
_start:
{
if (lean_obj_tag(v_x_795_) == 0)
{
lean_object* v___x_796_; 
v___x_796_ = lean_obj_once(&lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue___closed__0, &lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue___closed__0_once, _init_lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue___closed__0);
return v___x_796_;
}
else
{
lean_object* v_val_797_; uint8_t v_sign_798_; 
v_val_797_ = lean_ctor_get(v_x_795_, 0);
lean_inc(v_val_797_);
lean_dec_ref_known(v_x_795_, 1);
v_sign_798_ = lean_ctor_get_uint8(v_val_797_, sizeof(void*)*1 + 1);
if (v_sign_798_ == 2)
{
lean_object* v_digits_799_; lean_object* v___x_800_; lean_object* v___x_801_; lean_object* v___x_802_; lean_object* v___x_803_; 
v_digits_799_ = lean_ctor_get(v_val_797_, 0);
lean_inc_ref(v_digits_799_);
lean_dec(v_val_797_);
v___x_800_ = lp_algalVerification_Algal_Core_DecimalSyntax_Digits_list(v_digits_799_);
v___x_801_ = lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue(v___x_800_);
lean_dec(v___x_800_);
v___x_802_ = lean_nat_to_int(v___x_801_);
v___x_803_ = lean_int_neg(v___x_802_);
lean_dec(v___x_802_);
return v___x_803_;
}
else
{
lean_object* v_digits_804_; lean_object* v___x_805_; lean_object* v___x_806_; lean_object* v___x_807_; 
v_digits_804_ = lean_ctor_get(v_val_797_, 0);
lean_inc_ref(v_digits_804_);
lean_dec(v_val_797_);
v___x_805_ = lp_algalVerification_Algal_Core_DecimalSyntax_Digits_list(v_digits_804_);
v___x_806_ = lp_algalVerification_Algal_Core_DecimalSyntax_digitsValue(v___x_805_);
lean_dec(v___x_805_);
v___x_807_ = lean_nat_to_int(v___x_806_);
return v___x_807_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_power(lean_object* v_n_808_){
_start:
{
lean_object* v_exponent_809_; lean_object* v___x_810_; lean_object* v___x_811_; lean_object* v___x_812_; lean_object* v___x_813_; lean_object* v___x_814_; 
v_exponent_809_ = lean_ctor_get(v_n_808_, 2);
lean_inc(v_exponent_809_);
v___x_810_ = lp_algalVerification_Algal_Core_DecimalSyntax_exponentValue(v_exponent_809_);
v___x_811_ = lp_algalVerification_Algal_Core_DecimalSyntax_fractionDigits(v_n_808_);
v___x_812_ = l_List_lengthTR___redArg(v___x_811_);
lean_dec(v___x_811_);
v___x_813_ = lean_nat_to_int(v___x_812_);
v___x_814_ = lean_int_sub(v___x_810_, v___x_813_);
lean_dec(v___x_813_);
lean_dec(v___x_810_);
return v___x_814_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_signedCoefficient(lean_object* v_n_815_){
_start:
{
uint8_t v_negative_816_; 
v_negative_816_ = lean_ctor_get_uint8(v_n_815_, sizeof(void*)*3);
if (v_negative_816_ == 0)
{
lean_object* v___x_817_; lean_object* v___x_818_; 
v___x_817_ = lp_algalVerification_Algal_Core_DecimalSyntax_coefficient(v_n_815_);
v___x_818_ = lean_nat_to_int(v___x_817_);
return v___x_818_;
}
else
{
lean_object* v___x_819_; lean_object* v___x_820_; lean_object* v___x_821_; 
v___x_819_ = lp_algalVerification_Algal_Core_DecimalSyntax_coefficient(v_n_815_);
v___x_820_ = lean_nat_to_int(v___x_819_);
v___x_821_ = lean_int_neg(v___x_820_);
lean_dec(v___x_820_);
return v___x_821_;
}
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_DecimalSyntax_denote___closed__0(void){
_start:
{
lean_object* v___x_822_; lean_object* v___x_823_; 
v___x_822_ = lean_unsigned_to_nat(10u);
v___x_823_ = l_Nat_cast___at___00Dyadic_toRat_spec__0(v___x_822_);
return v___x_823_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_DecimalSyntax_denote(lean_object* v_n_824_){
_start:
{
lean_object* v___x_825_; lean_object* v___x_826_; lean_object* v___x_827_; lean_object* v___x_828_; lean_object* v___x_829_; lean_object* v___x_830_; 
lean_inc_ref(v_n_824_);
v___x_825_ = lp_algalVerification_Algal_Core_DecimalSyntax_signedCoefficient(v_n_824_);
v___x_826_ = l_Rat_ofInt(v___x_825_);
v___x_827_ = lean_obj_once(&lp_algalVerification_Algal_Core_DecimalSyntax_denote___closed__0, &lp_algalVerification_Algal_Core_DecimalSyntax_denote___closed__0_once, _init_lp_algalVerification_Algal_Core_DecimalSyntax_denote___closed__0);
v___x_828_ = lp_algalVerification_Algal_Core_DecimalSyntax_power(v_n_824_);
v___x_829_ = l_Rat_zpow(v___x_827_, v___x_828_);
lean_dec(v___x_828_);
v___x_830_ = l_Rat_mul(v___x_826_, v___x_829_);
lean_dec_ref(v___x_826_);
return v___x_830_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readDigits_match__1_splitter___redArg(lean_object* v_ds_831_, lean_object* v_h__1_832_, lean_object* v_h__2_833_){
_start:
{
if (lean_obj_tag(v_ds_831_) == 0)
{
lean_object* v___x_834_; lean_object* v___x_835_; 
lean_dec(v_h__2_833_);
v___x_834_ = lean_box(0);
v___x_835_ = lean_apply_1(v_h__1_832_, v___x_834_);
return v___x_835_;
}
else
{
lean_object* v_head_836_; lean_object* v_tail_837_; lean_object* v___x_838_; 
lean_dec(v_h__1_832_);
v_head_836_ = lean_ctor_get(v_ds_831_, 0);
lean_inc(v_head_836_);
v_tail_837_ = lean_ctor_get(v_ds_831_, 1);
lean_inc(v_tail_837_);
lean_dec_ref_known(v_ds_831_, 2);
v___x_838_ = lean_apply_2(v_h__2_833_, v_head_836_, v_tail_837_);
return v___x_838_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_DecimalSyntax_0__Algal_Core_DecimalSyntax_readDigits_match__1_splitter(lean_object* v_motive_839_, lean_object* v_ds_840_, lean_object* v_h__1_841_, lean_object* v_h__2_842_){
_start:
{
if (lean_obj_tag(v_ds_840_) == 0)
{
lean_object* v___x_843_; lean_object* v___x_844_; 
lean_dec(v_h__2_842_);
v___x_843_ = lean_box(0);
v___x_844_ = lean_apply_1(v_h__1_841_, v___x_843_);
return v___x_844_;
}
else
{
lean_object* v_head_845_; lean_object* v_tail_846_; lean_object* v___x_847_; 
lean_dec(v_h__1_841_);
v_head_845_ = lean_ctor_get(v_ds_840_, 0);
lean_inc(v_head_845_);
v_tail_846_ = lean_ctor_get(v_ds_840_, 1);
lean_inc(v_tail_846_);
lean_dec_ref_known(v_ds_840_, 2);
v___x_847_ = lean_apply_2(v_h__2_842_, v_head_845_, v_tail_846_);
return v___x_847_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_BinaryValue(uint8_t builtin);
lean_object* initialize_Init_Data_Nat_ToString(uint8_t builtin);
lean_object* initialize_Init_Data_Rat_Lemmas(uint8_t builtin);
lean_object* initialize_Init_Omega(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_DecimalSyntax(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_BinaryValue(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Nat_ToString(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Rat_Lemmas(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Omega(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0___boxed__const__1 = _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__0___boxed__const__1);
lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1___boxed__const__1 = _init_lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_DecimalSyntax_ExponentSign_chars___closed__1___boxed__const__1);
lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars___boxed__const__1 = _init_lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_DecimalSyntax_fractionChars___boxed__const__1);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
