// Lean compiler output
// Module: Algal.Core.JsonString
// Imports: public import Init public meta import Init public import Init public import Init.Data.String.Lemmas.Basic
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
uint8_t lean_uint32_dec_eq(uint32_t, uint32_t);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
lean_object* lean_nat_shiftr(lean_object*, lean_object*);
uint32_t l_Nat_digitChar(lean_object*);
lean_object* lean_nat_mod(lean_object*, lean_object*);
lean_object* l_List_lengthTR___redArg(lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* l_instDecidableEqChar___boxed(lean_object*, lean_object*);
lean_object* l_List_head_x3f___redArg(lean_object*);
uint8_t l_Option_instDecidableEq___redArg(lean_object*, lean_object*, lean_object*);
lean_object* lean_nat_mul(lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
uint32_t l_Char_ofNat(lean_object*);
lean_object* lean_string_mk(lean_object*);
lean_object* lean_array_to_list(lean_object*);
lean_object* l_List_foldl___at___00Array_appendList_spec__0___redArg(lean_object*, lean_object*);
lean_object* lean_mk_empty_array_with_capacity(lean_object*);
uint8_t lean_string_validate_utf8(lean_object*);
lean_object* lean_string_from_utf8_unchecked(lean_object*);
lean_object* lean_string_data(lean_object*);
uint8_t l_List_instDecidableEqNil___redArg(lean_object*);
lean_object* l_List_appendTR___redArg(lean_object*, lean_object*);
lean_object* lean_string_to_utf8(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__3_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__3;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__5_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__5;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__7_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__7;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__9_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__9;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__10_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__10;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__11_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__11;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12;
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__13_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__13;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar(uint32_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_hexDigit_x3f(uint32_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_hexDigit_x3f___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__1;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__3;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__4;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__5;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeEscape(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_readUnit(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_decodeEscape_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_decodeEscape_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_readUnit_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_readUnit_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_JsonString_escapedBody_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_JsonString_escapedBody_spec__0___boxed(lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Core_JsonString_escapedBody___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Core_JsonString_escapedBody___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_JsonString_escapedBody___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapedBody(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapedBody___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_quoteChars(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_quote(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_quoteBytes(lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_JsonString_scan___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_JsonString_scan___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_scan(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_scan___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__3_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__3_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__1_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_readQuoted(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_readQuoted_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_readQuoted_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_readBytes(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeBytes(lean_object*);
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0___boxed__const__1(void){
_start:
{
uint32_t v___x_1_; lean_object* v___x_2_; 
v___x_1_ = 114;
v___x_2_ = lean_box_uint32(v___x_1_);
return v___x_2_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0(void){
_start:
{
lean_object* v___x_3_; lean_object* v___x_4_; lean_object* v___x_5_; 
v___x_3_ = lean_box(0);
v___x_4_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0___boxed__const__1;
v___x_5_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_5_, 0, v___x_4_);
lean_ctor_set(v___x_5_, 1, v___x_3_);
return v___x_5_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1(void){
_start:
{
uint32_t v___x_6_; lean_object* v___x_7_; 
v___x_6_ = 92;
v___x_7_ = lean_box_uint32(v___x_6_);
return v___x_7_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1(void){
_start:
{
lean_object* v___x_8_; lean_object* v___x_9_; lean_object* v___x_10_; 
v___x_8_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0);
v___x_9_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_10_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_10_, 0, v___x_9_);
lean_ctor_set(v___x_10_, 1, v___x_8_);
return v___x_10_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2___boxed__const__1(void){
_start:
{
uint32_t v___x_11_; lean_object* v___x_12_; 
v___x_11_ = 102;
v___x_12_ = lean_box_uint32(v___x_11_);
return v___x_12_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2(void){
_start:
{
lean_object* v___x_13_; lean_object* v___x_14_; lean_object* v___x_15_; 
v___x_13_ = lean_box(0);
v___x_14_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2___boxed__const__1;
v___x_15_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_15_, 0, v___x_14_);
lean_ctor_set(v___x_15_, 1, v___x_13_);
return v___x_15_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__3(void){
_start:
{
lean_object* v___x_16_; lean_object* v___x_17_; lean_object* v___x_18_; 
v___x_16_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2);
v___x_17_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_18_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_18_, 0, v___x_17_);
lean_ctor_set(v___x_18_, 1, v___x_16_);
return v___x_18_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4___boxed__const__1(void){
_start:
{
uint32_t v___x_19_; lean_object* v___x_20_; 
v___x_19_ = 110;
v___x_20_ = lean_box_uint32(v___x_19_);
return v___x_20_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4(void){
_start:
{
lean_object* v___x_21_; lean_object* v___x_22_; lean_object* v___x_23_; 
v___x_21_ = lean_box(0);
v___x_22_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4___boxed__const__1;
v___x_23_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_23_, 0, v___x_22_);
lean_ctor_set(v___x_23_, 1, v___x_21_);
return v___x_23_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__5(void){
_start:
{
lean_object* v___x_24_; lean_object* v___x_25_; lean_object* v___x_26_; 
v___x_24_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4);
v___x_25_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_26_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_26_, 0, v___x_25_);
lean_ctor_set(v___x_26_, 1, v___x_24_);
return v___x_26_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6___boxed__const__1(void){
_start:
{
uint32_t v___x_27_; lean_object* v___x_28_; 
v___x_27_ = 116;
v___x_28_ = lean_box_uint32(v___x_27_);
return v___x_28_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6(void){
_start:
{
lean_object* v___x_29_; lean_object* v___x_30_; lean_object* v___x_31_; 
v___x_29_ = lean_box(0);
v___x_30_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6___boxed__const__1;
v___x_31_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_31_, 0, v___x_30_);
lean_ctor_set(v___x_31_, 1, v___x_29_);
return v___x_31_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__7(void){
_start:
{
lean_object* v___x_32_; lean_object* v___x_33_; lean_object* v___x_34_; 
v___x_32_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6);
v___x_33_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_34_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_34_, 0, v___x_33_);
lean_ctor_set(v___x_34_, 1, v___x_32_);
return v___x_34_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8___boxed__const__1(void){
_start:
{
uint32_t v___x_35_; lean_object* v___x_36_; 
v___x_35_ = 98;
v___x_36_ = lean_box_uint32(v___x_35_);
return v___x_36_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8(void){
_start:
{
lean_object* v___x_37_; lean_object* v___x_38_; lean_object* v___x_39_; 
v___x_37_ = lean_box(0);
v___x_38_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8___boxed__const__1;
v___x_39_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_39_, 0, v___x_38_);
lean_ctor_set(v___x_39_, 1, v___x_37_);
return v___x_39_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__9(void){
_start:
{
lean_object* v___x_40_; lean_object* v___x_41_; lean_object* v___x_42_; 
v___x_40_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8);
v___x_41_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_42_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_42_, 0, v___x_41_);
lean_ctor_set(v___x_42_, 1, v___x_40_);
return v___x_42_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__10(void){
_start:
{
lean_object* v___x_43_; lean_object* v___x_44_; lean_object* v___x_45_; 
v___x_43_ = lean_box(0);
v___x_44_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_45_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_45_, 0, v___x_44_);
lean_ctor_set(v___x_45_, 1, v___x_43_);
return v___x_45_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__11(void){
_start:
{
lean_object* v___x_46_; lean_object* v___x_47_; lean_object* v___x_48_; 
v___x_46_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__10, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__10_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__10);
v___x_47_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_48_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_48_, 0, v___x_47_);
lean_ctor_set(v___x_48_, 1, v___x_46_);
return v___x_48_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1(void){
_start:
{
uint32_t v___x_49_; lean_object* v___x_50_; 
v___x_49_ = 34;
v___x_50_ = lean_box_uint32(v___x_49_);
return v___x_50_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12(void){
_start:
{
lean_object* v___x_51_; lean_object* v___x_52_; lean_object* v___x_53_; 
v___x_51_ = lean_box(0);
v___x_52_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1;
v___x_53_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_53_, 0, v___x_52_);
lean_ctor_set(v___x_53_, 1, v___x_51_);
return v___x_53_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__13(void){
_start:
{
lean_object* v___x_54_; lean_object* v___x_55_; lean_object* v___x_56_; 
v___x_54_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12);
v___x_55_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_56_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_56_, 0, v___x_55_);
lean_ctor_set(v___x_56_, 1, v___x_54_);
return v___x_56_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1(void){
_start:
{
uint32_t v___x_57_; lean_object* v___x_58_; 
v___x_57_ = 117;
v___x_58_ = lean_box_uint32(v___x_57_);
return v___x_58_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2(void){
_start:
{
uint32_t v___x_59_; lean_object* v___x_60_; 
v___x_59_ = 48;
v___x_60_ = lean_box_uint32(v___x_59_);
return v___x_60_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar(uint32_t v_c_61_){
_start:
{
uint32_t v___x_62_; uint8_t v___x_63_; 
v___x_62_ = 34;
v___x_63_ = lean_uint32_dec_eq(v_c_61_, v___x_62_);
if (v___x_63_ == 0)
{
uint32_t v___x_64_; uint8_t v___x_65_; 
v___x_64_ = 92;
v___x_65_ = lean_uint32_dec_eq(v_c_61_, v___x_64_);
if (v___x_65_ == 0)
{
uint32_t v___x_66_; uint8_t v___x_67_; 
v___x_66_ = 8;
v___x_67_ = lean_uint32_dec_eq(v_c_61_, v___x_66_);
if (v___x_67_ == 0)
{
uint32_t v___x_68_; uint8_t v___x_69_; 
v___x_68_ = 9;
v___x_69_ = lean_uint32_dec_eq(v_c_61_, v___x_68_);
if (v___x_69_ == 0)
{
uint32_t v___x_70_; uint8_t v___x_71_; 
v___x_70_ = 10;
v___x_71_ = lean_uint32_dec_eq(v_c_61_, v___x_70_);
if (v___x_71_ == 0)
{
uint32_t v___x_72_; uint8_t v___x_73_; 
v___x_72_ = 12;
v___x_73_ = lean_uint32_dec_eq(v_c_61_, v___x_72_);
if (v___x_73_ == 0)
{
uint32_t v___x_74_; uint8_t v___x_75_; 
v___x_74_ = 13;
v___x_75_ = lean_uint32_dec_eq(v_c_61_, v___x_74_);
if (v___x_75_ == 0)
{
lean_object* v___x_76_; lean_object* v___x_77_; uint8_t v___x_78_; 
v___x_76_ = lean_uint32_to_nat(v_c_61_);
v___x_77_ = lean_unsigned_to_nat(32u);
v___x_78_ = lean_nat_dec_lt(v___x_76_, v___x_77_);
if (v___x_78_ == 0)
{
lean_object* v___x_79_; lean_object* v___x_80_; lean_object* v___x_81_; 
lean_dec(v___x_76_);
v___x_79_ = lean_box(0);
v___x_80_ = lean_box_uint32(v_c_61_);
v___x_81_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_81_, 0, v___x_80_);
lean_ctor_set(v___x_81_, 1, v___x_79_);
return v___x_81_;
}
else
{
lean_object* v___x_82_; lean_object* v___x_83_; lean_object* v___x_84_; uint32_t v___x_85_; lean_object* v___x_86_; uint32_t v___x_87_; lean_object* v___x_88_; lean_object* v___x_89_; lean_object* v___x_90_; lean_object* v___x_91_; lean_object* v___x_92_; lean_object* v___x_93_; lean_object* v___x_94_; lean_object* v___x_95_; lean_object* v___x_96_; lean_object* v___x_97_; lean_object* v___x_98_; lean_object* v___x_99_; lean_object* v___x_100_; 
v___x_82_ = lean_unsigned_to_nat(16u);
v___x_83_ = lean_unsigned_to_nat(4u);
v___x_84_ = lean_nat_shiftr(v___x_76_, v___x_83_);
v___x_85_ = l_Nat_digitChar(v___x_84_);
lean_dec(v___x_84_);
v___x_86_ = lean_nat_mod(v___x_76_, v___x_82_);
lean_dec(v___x_76_);
v___x_87_ = l_Nat_digitChar(v___x_86_);
lean_dec(v___x_86_);
v___x_88_ = lean_box(0);
v___x_89_ = lean_box_uint32(v___x_87_);
v___x_90_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_90_, 0, v___x_89_);
lean_ctor_set(v___x_90_, 1, v___x_88_);
v___x_91_ = lean_box_uint32(v___x_85_);
v___x_92_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_92_, 0, v___x_91_);
lean_ctor_set(v___x_92_, 1, v___x_90_);
v___x_93_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
v___x_94_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_94_, 0, v___x_93_);
lean_ctor_set(v___x_94_, 1, v___x_92_);
v___x_95_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
v___x_96_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_96_, 0, v___x_95_);
lean_ctor_set(v___x_96_, 1, v___x_94_);
v___x_97_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
v___x_98_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_98_, 0, v___x_97_);
lean_ctor_set(v___x_98_, 1, v___x_96_);
v___x_99_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
v___x_100_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_100_, 0, v___x_99_);
lean_ctor_set(v___x_100_, 1, v___x_98_);
return v___x_100_;
}
}
else
{
lean_object* v___x_101_; 
v___x_101_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1);
return v___x_101_;
}
}
else
{
lean_object* v___x_102_; 
v___x_102_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__3, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__3_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__3);
return v___x_102_;
}
}
else
{
lean_object* v___x_103_; 
v___x_103_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__5, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__5_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__5);
return v___x_103_;
}
}
else
{
lean_object* v___x_104_; 
v___x_104_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__7, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__7_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__7);
return v___x_104_;
}
}
else
{
lean_object* v___x_105_; 
v___x_105_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__9, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__9_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__9);
return v___x_105_;
}
}
else
{
lean_object* v___x_106_; 
v___x_106_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__11, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__11_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__11);
return v___x_106_;
}
}
else
{
lean_object* v___x_107_; 
v___x_107_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__13, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__13_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__13);
return v___x_107_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed(lean_object* v_c_108_){
_start:
{
uint32_t v_c_boxed_109_; lean_object* v_res_110_; 
v_c_boxed_109_ = lean_unbox_uint32(v_c_108_);
lean_dec(v_c_108_);
v_res_110_ = lp_algalVerification_Algal_Core_JsonString_escapeChar(v_c_boxed_109_);
return v_res_110_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_hexDigit_x3f(uint32_t v_c_111_){
_start:
{
lean_object* v___x_112_; lean_object* v___x_113_; uint8_t v___x_124_; 
v___x_112_ = lean_unsigned_to_nat(48u);
v___x_113_ = lean_uint32_to_nat(v_c_111_);
v___x_124_ = lean_nat_dec_le(v___x_112_, v___x_113_);
if (v___x_124_ == 0)
{
goto v___jp_114_;
}
else
{
lean_object* v___x_125_; uint8_t v___x_126_; 
v___x_125_ = lean_unsigned_to_nat(57u);
v___x_126_ = lean_nat_dec_le(v___x_113_, v___x_125_);
if (v___x_126_ == 0)
{
goto v___jp_114_;
}
else
{
lean_object* v___x_127_; lean_object* v___x_128_; 
v___x_127_ = lean_nat_sub(v___x_113_, v___x_112_);
lean_dec(v___x_113_);
v___x_128_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_128_, 0, v___x_127_);
return v___x_128_;
}
}
v___jp_114_:
{
lean_object* v___x_115_; uint8_t v___x_116_; 
v___x_115_ = lean_unsigned_to_nat(97u);
v___x_116_ = lean_nat_dec_le(v___x_115_, v___x_113_);
if (v___x_116_ == 0)
{
lean_object* v___x_117_; 
lean_dec(v___x_113_);
v___x_117_ = lean_box(0);
return v___x_117_;
}
else
{
lean_object* v___x_118_; uint8_t v___x_119_; 
v___x_118_ = lean_unsigned_to_nat(102u);
v___x_119_ = lean_nat_dec_le(v___x_113_, v___x_118_);
if (v___x_119_ == 0)
{
lean_object* v___x_120_; 
lean_dec(v___x_113_);
v___x_120_ = lean_box(0);
return v___x_120_;
}
else
{
lean_object* v___x_121_; lean_object* v___x_122_; lean_object* v___x_123_; 
v___x_121_ = lean_unsigned_to_nat(87u);
v___x_122_ = lean_nat_sub(v___x_113_, v___x_121_);
lean_dec(v___x_113_);
v___x_123_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_123_, 0, v___x_122_);
return v___x_123_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_hexDigit_x3f___boxed(lean_object* v_c_129_){
_start:
{
uint32_t v_c_boxed_130_; lean_object* v_res_131_; 
v_c_boxed_130_ = lean_unbox_uint32(v_c_129_);
lean_dec(v_c_129_);
v_res_131_ = lp_algalVerification_Algal_Core_JsonString_hexDigit_x3f(v_c_boxed_130_);
return v_res_131_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__1(void){
_start:
{
uint32_t v___x_132_; lean_object* v___x_133_; 
v___x_132_ = 13;
v___x_133_ = lean_box_uint32(v___x_132_);
return v___x_133_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__2(void){
_start:
{
uint32_t v___x_134_; lean_object* v___x_135_; 
v___x_134_ = 12;
v___x_135_ = lean_box_uint32(v___x_134_);
return v___x_135_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__3(void){
_start:
{
uint32_t v___x_136_; lean_object* v___x_137_; 
v___x_136_ = 10;
v___x_137_ = lean_box_uint32(v___x_136_);
return v___x_137_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__4(void){
_start:
{
uint32_t v___x_138_; lean_object* v___x_139_; 
v___x_138_ = 9;
v___x_139_ = lean_box_uint32(v___x_138_);
return v___x_139_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__5(void){
_start:
{
uint32_t v___x_140_; lean_object* v___x_141_; 
v___x_140_ = 8;
v___x_141_ = lean_box_uint32(v___x_140_);
return v___x_141_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeEscape(lean_object* v_x_142_){
_start:
{
if (lean_obj_tag(v_x_142_) == 1)
{
lean_object* v_head_143_; lean_object* v_tail_144_; lean_object* v___x_146_; uint8_t v_isShared_147_; uint8_t v_isSharedCheck_257_; 
v_head_143_ = lean_ctor_get(v_x_142_, 0);
v_tail_144_ = lean_ctor_get(v_x_142_, 1);
v_isSharedCheck_257_ = !lean_is_exclusive(v_x_142_);
if (v_isSharedCheck_257_ == 0)
{
v___x_146_ = v_x_142_;
v_isShared_147_ = v_isSharedCheck_257_;
goto v_resetjp_145_;
}
else
{
lean_inc(v_tail_144_);
lean_inc(v_head_143_);
lean_dec(v_x_142_);
v___x_146_ = lean_box(0);
v_isShared_147_ = v_isSharedCheck_257_;
goto v_resetjp_145_;
}
v_resetjp_145_:
{
uint32_t v___x_148_; uint32_t v___x_149_; uint8_t v___x_150_; 
v___x_148_ = 34;
v___x_149_ = lean_unbox_uint32(v_head_143_);
v___x_150_ = lean_uint32_dec_eq(v___x_149_, v___x_148_);
if (v___x_150_ == 0)
{
uint32_t v___x_151_; uint32_t v___x_152_; uint8_t v___x_153_; 
v___x_151_ = 92;
v___x_152_ = lean_unbox_uint32(v_head_143_);
v___x_153_ = lean_uint32_dec_eq(v___x_152_, v___x_151_);
if (v___x_153_ == 0)
{
uint32_t v___x_154_; uint32_t v___x_155_; uint8_t v___x_156_; 
v___x_154_ = 98;
v___x_155_ = lean_unbox_uint32(v_head_143_);
v___x_156_ = lean_uint32_dec_eq(v___x_155_, v___x_154_);
if (v___x_156_ == 0)
{
uint32_t v___x_157_; uint32_t v___x_158_; uint8_t v___x_159_; 
v___x_157_ = 116;
v___x_158_ = lean_unbox_uint32(v_head_143_);
v___x_159_ = lean_uint32_dec_eq(v___x_158_, v___x_157_);
if (v___x_159_ == 0)
{
uint32_t v___x_160_; uint32_t v___x_161_; uint8_t v___x_162_; 
v___x_160_ = 110;
v___x_161_ = lean_unbox_uint32(v_head_143_);
v___x_162_ = lean_uint32_dec_eq(v___x_161_, v___x_160_);
if (v___x_162_ == 0)
{
uint32_t v___x_163_; uint32_t v___x_164_; uint8_t v___x_165_; 
v___x_163_ = 102;
v___x_164_ = lean_unbox_uint32(v_head_143_);
v___x_165_ = lean_uint32_dec_eq(v___x_164_, v___x_163_);
if (v___x_165_ == 0)
{
uint32_t v___x_166_; uint32_t v___x_167_; uint8_t v___x_168_; 
v___x_166_ = 114;
v___x_167_ = lean_unbox_uint32(v_head_143_);
v___x_168_ = lean_uint32_dec_eq(v___x_167_, v___x_166_);
if (v___x_168_ == 0)
{
uint32_t v___x_169_; uint32_t v___x_170_; uint8_t v___x_171_; 
lean_del_object(v___x_146_);
v___x_169_ = 117;
v___x_170_ = lean_unbox_uint32(v_head_143_);
lean_dec(v_head_143_);
v___x_171_ = lean_uint32_dec_eq(v___x_170_, v___x_169_);
if (v___x_171_ == 0)
{
lean_object* v___x_172_; 
lean_dec(v_tail_144_);
v___x_172_ = lean_box(0);
return v___x_172_;
}
else
{
if (lean_obj_tag(v_tail_144_) == 1)
{
lean_object* v_head_173_; lean_object* v_tail_174_; uint32_t v___x_175_; uint32_t v___x_176_; uint8_t v___x_177_; 
v_head_173_ = lean_ctor_get(v_tail_144_, 0);
lean_inc(v_head_173_);
v_tail_174_ = lean_ctor_get(v_tail_144_, 1);
lean_inc(v_tail_174_);
lean_dec_ref_known(v_tail_144_, 2);
v___x_175_ = 48;
v___x_176_ = lean_unbox_uint32(v_head_173_);
lean_dec(v_head_173_);
v___x_177_ = lean_uint32_dec_eq(v___x_176_, v___x_175_);
if (v___x_177_ == 0)
{
lean_object* v___x_178_; 
lean_dec(v_tail_174_);
v___x_178_ = lean_box(0);
return v___x_178_;
}
else
{
if (lean_obj_tag(v_tail_174_) == 1)
{
lean_object* v_head_179_; lean_object* v_tail_180_; uint32_t v___x_181_; uint8_t v___x_182_; 
v_head_179_ = lean_ctor_get(v_tail_174_, 0);
lean_inc(v_head_179_);
v_tail_180_ = lean_ctor_get(v_tail_174_, 1);
lean_inc(v_tail_180_);
lean_dec_ref_known(v_tail_174_, 2);
v___x_181_ = lean_unbox_uint32(v_head_179_);
lean_dec(v_head_179_);
v___x_182_ = lean_uint32_dec_eq(v___x_181_, v___x_175_);
if (v___x_182_ == 0)
{
lean_object* v___x_183_; 
lean_dec(v_tail_180_);
v___x_183_ = lean_box(0);
return v___x_183_;
}
else
{
if (lean_obj_tag(v_tail_180_) == 1)
{
lean_object* v_tail_184_; 
v_tail_184_ = lean_ctor_get(v_tail_180_, 1);
lean_inc(v_tail_184_);
if (lean_obj_tag(v_tail_184_) == 1)
{
lean_object* v_head_185_; lean_object* v_head_186_; lean_object* v_tail_187_; lean_object* v___x_189_; uint8_t v_isShared_190_; uint8_t v_isSharedCheck_217_; 
v_head_185_ = lean_ctor_get(v_tail_180_, 0);
lean_inc(v_head_185_);
lean_dec_ref_known(v_tail_180_, 2);
v_head_186_ = lean_ctor_get(v_tail_184_, 0);
v_tail_187_ = lean_ctor_get(v_tail_184_, 1);
v_isSharedCheck_217_ = !lean_is_exclusive(v_tail_184_);
if (v_isSharedCheck_217_ == 0)
{
v___x_189_ = v_tail_184_;
v_isShared_190_ = v_isSharedCheck_217_;
goto v_resetjp_188_;
}
else
{
lean_inc(v_tail_187_);
lean_inc(v_head_186_);
lean_dec(v_tail_184_);
v___x_189_ = lean_box(0);
v_isShared_190_ = v_isSharedCheck_217_;
goto v_resetjp_188_;
}
v_resetjp_188_:
{
uint32_t v___x_191_; lean_object* v___x_192_; 
v___x_191_ = lean_unbox_uint32(v_head_185_);
lean_dec(v_head_185_);
v___x_192_ = lp_algalVerification_Algal_Core_JsonString_hexDigit_x3f(v___x_191_);
if (lean_obj_tag(v___x_192_) == 0)
{
lean_object* v___x_193_; 
lean_del_object(v___x_189_);
lean_dec(v_tail_187_);
lean_dec(v_head_186_);
v___x_193_ = lean_box(0);
return v___x_193_;
}
else
{
lean_object* v_val_194_; uint32_t v___x_195_; lean_object* v___x_196_; 
v_val_194_ = lean_ctor_get(v___x_192_, 0);
lean_inc(v_val_194_);
lean_dec_ref_known(v___x_192_, 1);
v___x_195_ = lean_unbox_uint32(v_head_186_);
lean_dec(v_head_186_);
v___x_196_ = lp_algalVerification_Algal_Core_JsonString_hexDigit_x3f(v___x_195_);
if (lean_obj_tag(v___x_196_) == 0)
{
lean_object* v___x_197_; 
lean_dec(v_val_194_);
lean_del_object(v___x_189_);
lean_dec(v_tail_187_);
v___x_197_ = lean_box(0);
return v___x_197_;
}
else
{
lean_object* v_val_198_; lean_object* v___x_200_; uint8_t v_isShared_201_; uint8_t v_isSharedCheck_216_; 
v_val_198_ = lean_ctor_get(v___x_196_, 0);
v_isSharedCheck_216_ = !lean_is_exclusive(v___x_196_);
if (v_isSharedCheck_216_ == 0)
{
v___x_200_ = v___x_196_;
v_isShared_201_ = v_isSharedCheck_216_;
goto v_resetjp_199_;
}
else
{
lean_inc(v_val_198_);
lean_dec(v___x_196_);
v___x_200_ = lean_box(0);
v_isShared_201_ = v_isSharedCheck_216_;
goto v_resetjp_199_;
}
v_resetjp_199_:
{
lean_object* v___x_202_; lean_object* v___x_203_; lean_object* v___x_204_; lean_object* v___x_205_; uint8_t v___x_206_; 
v___x_202_ = lean_unsigned_to_nat(16u);
v___x_203_ = lean_nat_mul(v_val_194_, v___x_202_);
lean_dec(v_val_194_);
v___x_204_ = lean_nat_add(v___x_203_, v_val_198_);
lean_dec(v_val_198_);
lean_dec(v___x_203_);
v___x_205_ = lean_unsigned_to_nat(32u);
v___x_206_ = lean_nat_dec_lt(v___x_204_, v___x_205_);
if (v___x_206_ == 0)
{
lean_object* v___x_207_; 
lean_dec(v___x_204_);
lean_del_object(v___x_200_);
lean_del_object(v___x_189_);
lean_dec(v_tail_187_);
v___x_207_ = lean_box(0);
return v___x_207_;
}
else
{
uint32_t v___x_208_; lean_object* v___x_209_; lean_object* v___x_211_; 
v___x_208_ = l_Char_ofNat(v___x_204_);
lean_dec(v___x_204_);
v___x_209_ = lean_box_uint32(v___x_208_);
if (v_isShared_190_ == 0)
{
lean_ctor_set_tag(v___x_189_, 0);
lean_ctor_set(v___x_189_, 0, v___x_209_);
v___x_211_ = v___x_189_;
goto v_reusejp_210_;
}
else
{
lean_object* v_reuseFailAlloc_215_; 
v_reuseFailAlloc_215_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_215_, 0, v___x_209_);
lean_ctor_set(v_reuseFailAlloc_215_, 1, v_tail_187_);
v___x_211_ = v_reuseFailAlloc_215_;
goto v_reusejp_210_;
}
v_reusejp_210_:
{
lean_object* v___x_213_; 
if (v_isShared_201_ == 0)
{
lean_ctor_set(v___x_200_, 0, v___x_211_);
v___x_213_ = v___x_200_;
goto v_reusejp_212_;
}
else
{
lean_object* v_reuseFailAlloc_214_; 
v_reuseFailAlloc_214_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_214_, 0, v___x_211_);
v___x_213_ = v_reuseFailAlloc_214_;
goto v_reusejp_212_;
}
v_reusejp_212_:
{
return v___x_213_;
}
}
}
}
}
}
}
}
else
{
lean_object* v___x_218_; 
lean_dec(v_tail_184_);
lean_dec_ref_known(v_tail_180_, 2);
v___x_218_ = lean_box(0);
return v___x_218_;
}
}
else
{
lean_object* v___x_219_; 
lean_dec(v_tail_180_);
v___x_219_ = lean_box(0);
return v___x_219_;
}
}
}
else
{
lean_object* v___x_220_; 
lean_dec(v_tail_174_);
v___x_220_ = lean_box(0);
return v___x_220_;
}
}
}
else
{
lean_object* v___x_221_; 
lean_dec(v_tail_144_);
v___x_221_ = lean_box(0);
return v___x_221_;
}
}
}
else
{
lean_object* v___x_222_; lean_object* v___x_224_; 
lean_dec(v_head_143_);
v___x_222_ = lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__1;
if (v_isShared_147_ == 0)
{
lean_ctor_set_tag(v___x_146_, 0);
lean_ctor_set(v___x_146_, 0, v___x_222_);
v___x_224_ = v___x_146_;
goto v_reusejp_223_;
}
else
{
lean_object* v_reuseFailAlloc_226_; 
v_reuseFailAlloc_226_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_226_, 0, v___x_222_);
lean_ctor_set(v_reuseFailAlloc_226_, 1, v_tail_144_);
v___x_224_ = v_reuseFailAlloc_226_;
goto v_reusejp_223_;
}
v_reusejp_223_:
{
lean_object* v___x_225_; 
v___x_225_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_225_, 0, v___x_224_);
return v___x_225_;
}
}
}
else
{
lean_object* v___x_227_; lean_object* v___x_229_; 
lean_dec(v_head_143_);
v___x_227_ = lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__2;
if (v_isShared_147_ == 0)
{
lean_ctor_set_tag(v___x_146_, 0);
lean_ctor_set(v___x_146_, 0, v___x_227_);
v___x_229_ = v___x_146_;
goto v_reusejp_228_;
}
else
{
lean_object* v_reuseFailAlloc_231_; 
v_reuseFailAlloc_231_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_231_, 0, v___x_227_);
lean_ctor_set(v_reuseFailAlloc_231_, 1, v_tail_144_);
v___x_229_ = v_reuseFailAlloc_231_;
goto v_reusejp_228_;
}
v_reusejp_228_:
{
lean_object* v___x_230_; 
v___x_230_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_230_, 0, v___x_229_);
return v___x_230_;
}
}
}
else
{
lean_object* v___x_232_; lean_object* v___x_234_; 
lean_dec(v_head_143_);
v___x_232_ = lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__3;
if (v_isShared_147_ == 0)
{
lean_ctor_set_tag(v___x_146_, 0);
lean_ctor_set(v___x_146_, 0, v___x_232_);
v___x_234_ = v___x_146_;
goto v_reusejp_233_;
}
else
{
lean_object* v_reuseFailAlloc_236_; 
v_reuseFailAlloc_236_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_236_, 0, v___x_232_);
lean_ctor_set(v_reuseFailAlloc_236_, 1, v_tail_144_);
v___x_234_ = v_reuseFailAlloc_236_;
goto v_reusejp_233_;
}
v_reusejp_233_:
{
lean_object* v___x_235_; 
v___x_235_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_235_, 0, v___x_234_);
return v___x_235_;
}
}
}
else
{
lean_object* v___x_237_; lean_object* v___x_239_; 
lean_dec(v_head_143_);
v___x_237_ = lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__4;
if (v_isShared_147_ == 0)
{
lean_ctor_set_tag(v___x_146_, 0);
lean_ctor_set(v___x_146_, 0, v___x_237_);
v___x_239_ = v___x_146_;
goto v_reusejp_238_;
}
else
{
lean_object* v_reuseFailAlloc_241_; 
v_reuseFailAlloc_241_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_241_, 0, v___x_237_);
lean_ctor_set(v_reuseFailAlloc_241_, 1, v_tail_144_);
v___x_239_ = v_reuseFailAlloc_241_;
goto v_reusejp_238_;
}
v_reusejp_238_:
{
lean_object* v___x_240_; 
v___x_240_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_240_, 0, v___x_239_);
return v___x_240_;
}
}
}
else
{
lean_object* v___x_242_; lean_object* v___x_244_; 
lean_dec(v_head_143_);
v___x_242_ = lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__5;
if (v_isShared_147_ == 0)
{
lean_ctor_set_tag(v___x_146_, 0);
lean_ctor_set(v___x_146_, 0, v___x_242_);
v___x_244_ = v___x_146_;
goto v_reusejp_243_;
}
else
{
lean_object* v_reuseFailAlloc_246_; 
v_reuseFailAlloc_246_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_246_, 0, v___x_242_);
lean_ctor_set(v_reuseFailAlloc_246_, 1, v_tail_144_);
v___x_244_ = v_reuseFailAlloc_246_;
goto v_reusejp_243_;
}
v_reusejp_243_:
{
lean_object* v___x_245_; 
v___x_245_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_245_, 0, v___x_244_);
return v___x_245_;
}
}
}
else
{
lean_object* v___x_247_; lean_object* v___x_249_; 
lean_dec(v_head_143_);
v___x_247_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1;
if (v_isShared_147_ == 0)
{
lean_ctor_set_tag(v___x_146_, 0);
lean_ctor_set(v___x_146_, 0, v___x_247_);
v___x_249_ = v___x_146_;
goto v_reusejp_248_;
}
else
{
lean_object* v_reuseFailAlloc_251_; 
v_reuseFailAlloc_251_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_251_, 0, v___x_247_);
lean_ctor_set(v_reuseFailAlloc_251_, 1, v_tail_144_);
v___x_249_ = v_reuseFailAlloc_251_;
goto v_reusejp_248_;
}
v_reusejp_248_:
{
lean_object* v___x_250_; 
v___x_250_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_250_, 0, v___x_249_);
return v___x_250_;
}
}
}
else
{
lean_object* v___x_252_; lean_object* v___x_254_; 
lean_dec(v_head_143_);
v___x_252_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1;
if (v_isShared_147_ == 0)
{
lean_ctor_set_tag(v___x_146_, 0);
lean_ctor_set(v___x_146_, 0, v___x_252_);
v___x_254_ = v___x_146_;
goto v_reusejp_253_;
}
else
{
lean_object* v_reuseFailAlloc_256_; 
v_reuseFailAlloc_256_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_256_, 0, v___x_252_);
lean_ctor_set(v_reuseFailAlloc_256_, 1, v_tail_144_);
v___x_254_ = v_reuseFailAlloc_256_;
goto v_reusejp_253_;
}
v_reusejp_253_:
{
lean_object* v___x_255_; 
v___x_255_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_255_, 0, v___x_254_);
return v___x_255_;
}
}
}
}
else
{
lean_object* v___x_258_; 
lean_dec(v_x_142_);
v___x_258_ = lean_box(0);
return v___x_258_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_readUnit(lean_object* v_x_259_){
_start:
{
if (lean_obj_tag(v_x_259_) == 0)
{
lean_object* v___x_260_; 
v___x_260_ = lean_box(0);
return v___x_260_;
}
else
{
lean_object* v_head_261_; lean_object* v_tail_262_; lean_object* v___x_264_; uint8_t v_isShared_265_; uint8_t v_isSharedCheck_283_; 
v_head_261_ = lean_ctor_get(v_x_259_, 0);
v_tail_262_ = lean_ctor_get(v_x_259_, 1);
v_isSharedCheck_283_ = !lean_is_exclusive(v_x_259_);
if (v_isSharedCheck_283_ == 0)
{
v___x_264_ = v_x_259_;
v_isShared_265_ = v_isSharedCheck_283_;
goto v_resetjp_263_;
}
else
{
lean_inc(v_tail_262_);
lean_inc(v_head_261_);
lean_dec(v_x_259_);
v___x_264_ = lean_box(0);
v_isShared_265_ = v_isSharedCheck_283_;
goto v_resetjp_263_;
}
v_resetjp_263_:
{
uint32_t v___x_266_; uint32_t v___x_267_; uint8_t v___x_268_; 
v___x_266_ = 92;
v___x_267_ = lean_unbox_uint32(v_head_261_);
v___x_268_ = lean_uint32_dec_eq(v___x_267_, v___x_266_);
if (v___x_268_ == 0)
{
uint32_t v___x_269_; uint32_t v___x_270_; uint8_t v___x_271_; 
v___x_269_ = 34;
v___x_270_ = lean_unbox_uint32(v_head_261_);
v___x_271_ = lean_uint32_dec_eq(v___x_270_, v___x_269_);
if (v___x_271_ == 0)
{
uint32_t v___x_272_; lean_object* v___x_273_; lean_object* v___x_274_; uint8_t v___x_275_; 
v___x_272_ = lean_unbox_uint32(v_head_261_);
v___x_273_ = lean_uint32_to_nat(v___x_272_);
v___x_274_ = lean_unsigned_to_nat(32u);
v___x_275_ = lean_nat_dec_lt(v___x_273_, v___x_274_);
lean_dec(v___x_273_);
if (v___x_275_ == 0)
{
lean_object* v___x_277_; 
if (v_isShared_265_ == 0)
{
lean_ctor_set_tag(v___x_264_, 0);
v___x_277_ = v___x_264_;
goto v_reusejp_276_;
}
else
{
lean_object* v_reuseFailAlloc_279_; 
v_reuseFailAlloc_279_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_279_, 0, v_head_261_);
lean_ctor_set(v_reuseFailAlloc_279_, 1, v_tail_262_);
v___x_277_ = v_reuseFailAlloc_279_;
goto v_reusejp_276_;
}
v_reusejp_276_:
{
lean_object* v___x_278_; 
v___x_278_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_278_, 0, v___x_277_);
return v___x_278_;
}
}
else
{
lean_object* v___x_280_; 
lean_del_object(v___x_264_);
lean_dec(v_tail_262_);
lean_dec(v_head_261_);
v___x_280_ = lean_box(0);
return v___x_280_;
}
}
else
{
lean_object* v___x_281_; 
lean_del_object(v___x_264_);
lean_dec(v_tail_262_);
lean_dec(v_head_261_);
v___x_281_ = lean_box(0);
return v___x_281_;
}
}
else
{
lean_object* v___x_282_; 
lean_del_object(v___x_264_);
lean_dec(v_head_261_);
v___x_282_ = lp_algalVerification_Algal_Core_JsonString_decodeEscape(v_tail_262_);
return v___x_282_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_decodeEscape_match__1_splitter___redArg(lean_object* v_x_284_, lean_object* v_h__1_285_, lean_object* v_h__2_286_, lean_object* v_h__3_287_, lean_object* v_h__4_288_, lean_object* v_h__5_289_, lean_object* v_h__6_290_, lean_object* v_h__7_291_, lean_object* v_h__8_292_, lean_object* v_h__9_293_){
_start:
{
if (lean_obj_tag(v_x_284_) == 1)
{
lean_object* v_head_294_; lean_object* v_tail_295_; uint32_t v___x_296_; uint32_t v___x_297_; uint8_t v___x_298_; 
v_head_294_ = lean_ctor_get(v_x_284_, 0);
v_tail_295_ = lean_ctor_get(v_x_284_, 1);
lean_inc(v_tail_295_);
v___x_296_ = 34;
v___x_297_ = lean_unbox_uint32(v_head_294_);
v___x_298_ = lean_uint32_dec_eq(v___x_297_, v___x_296_);
if (v___x_298_ == 0)
{
uint32_t v___x_299_; uint32_t v___x_300_; uint8_t v___x_301_; 
lean_dec(v_h__1_285_);
v___x_299_ = 92;
v___x_300_ = lean_unbox_uint32(v_head_294_);
v___x_301_ = lean_uint32_dec_eq(v___x_300_, v___x_299_);
if (v___x_301_ == 0)
{
uint32_t v___x_302_; uint32_t v___x_303_; uint8_t v___x_304_; 
lean_dec(v_h__2_286_);
v___x_302_ = 98;
v___x_303_ = lean_unbox_uint32(v_head_294_);
v___x_304_ = lean_uint32_dec_eq(v___x_303_, v___x_302_);
if (v___x_304_ == 0)
{
uint32_t v___x_305_; uint32_t v___x_306_; uint8_t v___x_307_; 
lean_dec(v_h__3_287_);
v___x_305_ = 116;
v___x_306_ = lean_unbox_uint32(v_head_294_);
v___x_307_ = lean_uint32_dec_eq(v___x_306_, v___x_305_);
if (v___x_307_ == 0)
{
uint32_t v___x_308_; uint32_t v___x_309_; uint8_t v___x_310_; 
lean_dec(v_h__4_288_);
v___x_308_ = 110;
v___x_309_ = lean_unbox_uint32(v_head_294_);
v___x_310_ = lean_uint32_dec_eq(v___x_309_, v___x_308_);
if (v___x_310_ == 0)
{
uint32_t v___x_311_; uint32_t v___x_312_; uint8_t v___x_313_; 
lean_dec(v_h__5_289_);
v___x_311_ = 102;
v___x_312_ = lean_unbox_uint32(v_head_294_);
v___x_313_ = lean_uint32_dec_eq(v___x_312_, v___x_311_);
if (v___x_313_ == 0)
{
uint32_t v___x_314_; uint32_t v___x_315_; uint8_t v___x_316_; 
lean_dec(v_h__6_290_);
v___x_314_ = 114;
v___x_315_ = lean_unbox_uint32(v_head_294_);
v___x_316_ = lean_uint32_dec_eq(v___x_315_, v___x_314_);
if (v___x_316_ == 0)
{
uint32_t v___x_317_; uint32_t v___x_318_; uint8_t v___x_319_; 
lean_dec(v_h__7_291_);
v___x_317_ = 117;
v___x_318_ = lean_unbox_uint32(v_head_294_);
v___x_319_ = lean_uint32_dec_eq(v___x_318_, v___x_317_);
if (v___x_319_ == 0)
{
lean_object* v___x_320_; 
lean_dec(v_tail_295_);
lean_dec(v_h__8_292_);
v___x_320_ = lean_apply_9(v_h__9_293_, v_x_284_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_320_;
}
else
{
lean_object* v___x_322_; uint8_t v_isShared_323_; uint8_t v_isSharedCheck_404_; 
v_isSharedCheck_404_ = !lean_is_exclusive(v_x_284_);
if (v_isSharedCheck_404_ == 0)
{
lean_object* v_unused_405_; lean_object* v_unused_406_; 
v_unused_405_ = lean_ctor_get(v_x_284_, 1);
lean_dec(v_unused_405_);
v_unused_406_ = lean_ctor_get(v_x_284_, 0);
lean_dec(v_unused_406_);
v___x_322_ = v_x_284_;
v_isShared_323_ = v_isSharedCheck_404_;
goto v_resetjp_321_;
}
else
{
lean_dec(v_x_284_);
v___x_322_ = lean_box(0);
v_isShared_323_ = v_isSharedCheck_404_;
goto v_resetjp_321_;
}
v_resetjp_321_:
{
if (lean_obj_tag(v_tail_295_) == 1)
{
lean_object* v_head_324_; lean_object* v_tail_325_; uint32_t v___x_326_; uint32_t v___x_327_; uint8_t v___x_328_; 
v_head_324_ = lean_ctor_get(v_tail_295_, 0);
v_tail_325_ = lean_ctor_get(v_tail_295_, 1);
lean_inc(v_tail_325_);
v___x_326_ = 48;
v___x_327_ = lean_unbox_uint32(v_head_324_);
v___x_328_ = lean_uint32_dec_eq(v___x_327_, v___x_326_);
if (v___x_328_ == 0)
{
lean_object* v___x_329_; lean_object* v___x_331_; 
lean_dec(v_tail_325_);
lean_dec(v_h__8_292_);
v___x_329_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_323_ == 0)
{
lean_ctor_set(v___x_322_, 0, v___x_329_);
v___x_331_ = v___x_322_;
goto v_reusejp_330_;
}
else
{
lean_object* v_reuseFailAlloc_333_; 
v_reuseFailAlloc_333_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_333_, 0, v___x_329_);
lean_ctor_set(v_reuseFailAlloc_333_, 1, v_tail_295_);
v___x_331_ = v_reuseFailAlloc_333_;
goto v_reusejp_330_;
}
v_reusejp_330_:
{
lean_object* v___x_332_; 
v___x_332_ = lean_apply_9(v_h__9_293_, v___x_331_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_332_;
}
}
else
{
lean_object* v___x_335_; uint8_t v_isShared_336_; uint8_t v_isSharedCheck_396_; 
v_isSharedCheck_396_ = !lean_is_exclusive(v_tail_295_);
if (v_isSharedCheck_396_ == 0)
{
lean_object* v_unused_397_; lean_object* v_unused_398_; 
v_unused_397_ = lean_ctor_get(v_tail_295_, 1);
lean_dec(v_unused_397_);
v_unused_398_ = lean_ctor_get(v_tail_295_, 0);
lean_dec(v_unused_398_);
v___x_335_ = v_tail_295_;
v_isShared_336_ = v_isSharedCheck_396_;
goto v_resetjp_334_;
}
else
{
lean_dec(v_tail_295_);
v___x_335_ = lean_box(0);
v_isShared_336_ = v_isSharedCheck_396_;
goto v_resetjp_334_;
}
v_resetjp_334_:
{
if (lean_obj_tag(v_tail_325_) == 1)
{
lean_object* v_head_337_; lean_object* v_tail_338_; uint32_t v___x_339_; uint8_t v___x_340_; 
v_head_337_ = lean_ctor_get(v_tail_325_, 0);
v_tail_338_ = lean_ctor_get(v_tail_325_, 1);
v___x_339_ = lean_unbox_uint32(v_head_337_);
v___x_340_ = lean_uint32_dec_eq(v___x_339_, v___x_326_);
if (v___x_340_ == 0)
{
lean_object* v___x_341_; lean_object* v___x_343_; 
lean_dec(v_h__8_292_);
v___x_341_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_336_ == 0)
{
lean_ctor_set(v___x_335_, 0, v___x_341_);
v___x_343_ = v___x_335_;
goto v_reusejp_342_;
}
else
{
lean_object* v_reuseFailAlloc_349_; 
v_reuseFailAlloc_349_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_349_, 0, v___x_341_);
lean_ctor_set(v_reuseFailAlloc_349_, 1, v_tail_325_);
v___x_343_ = v_reuseFailAlloc_349_;
goto v_reusejp_342_;
}
v_reusejp_342_:
{
lean_object* v___x_344_; lean_object* v___x_346_; 
v___x_344_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_323_ == 0)
{
lean_ctor_set(v___x_322_, 1, v___x_343_);
lean_ctor_set(v___x_322_, 0, v___x_344_);
v___x_346_ = v___x_322_;
goto v_reusejp_345_;
}
else
{
lean_object* v_reuseFailAlloc_348_; 
v_reuseFailAlloc_348_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_348_, 0, v___x_344_);
lean_ctor_set(v_reuseFailAlloc_348_, 1, v___x_343_);
v___x_346_ = v_reuseFailAlloc_348_;
goto v_reusejp_345_;
}
v_reusejp_345_:
{
lean_object* v___x_347_; 
v___x_347_ = lean_apply_9(v_h__9_293_, v___x_346_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_347_;
}
}
}
else
{
lean_object* v___x_351_; uint8_t v_isShared_352_; uint8_t v_isSharedCheck_384_; 
lean_inc(v_tail_338_);
v_isSharedCheck_384_ = !lean_is_exclusive(v_tail_325_);
if (v_isSharedCheck_384_ == 0)
{
lean_object* v_unused_385_; lean_object* v_unused_386_; 
v_unused_385_ = lean_ctor_get(v_tail_325_, 1);
lean_dec(v_unused_385_);
v_unused_386_ = lean_ctor_get(v_tail_325_, 0);
lean_dec(v_unused_386_);
v___x_351_ = v_tail_325_;
v_isShared_352_ = v_isSharedCheck_384_;
goto v_resetjp_350_;
}
else
{
lean_dec(v_tail_325_);
v___x_351_ = lean_box(0);
v_isShared_352_ = v_isSharedCheck_384_;
goto v_resetjp_350_;
}
v_resetjp_350_:
{
if (lean_obj_tag(v_tail_338_) == 1)
{
lean_object* v_tail_353_; 
v_tail_353_ = lean_ctor_get(v_tail_338_, 1);
if (lean_obj_tag(v_tail_353_) == 1)
{
lean_object* v_head_354_; lean_object* v_head_355_; lean_object* v_tail_356_; lean_object* v___x_357_; 
lean_inc_ref(v_tail_353_);
lean_del_object(v___x_351_);
lean_del_object(v___x_335_);
lean_del_object(v___x_322_);
lean_dec(v_h__9_293_);
v_head_354_ = lean_ctor_get(v_tail_338_, 0);
lean_inc(v_head_354_);
lean_dec_ref_known(v_tail_338_, 2);
v_head_355_ = lean_ctor_get(v_tail_353_, 0);
lean_inc(v_head_355_);
v_tail_356_ = lean_ctor_get(v_tail_353_, 1);
lean_inc(v_tail_356_);
lean_dec_ref_known(v_tail_353_, 2);
v___x_357_ = lean_apply_3(v_h__8_292_, v_head_354_, v_head_355_, v_tail_356_);
return v___x_357_;
}
else
{
lean_object* v___x_358_; lean_object* v___x_360_; 
lean_dec(v_h__8_292_);
v___x_358_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_352_ == 0)
{
lean_ctor_set(v___x_351_, 0, v___x_358_);
v___x_360_ = v___x_351_;
goto v_reusejp_359_;
}
else
{
lean_object* v_reuseFailAlloc_370_; 
v_reuseFailAlloc_370_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_370_, 0, v___x_358_);
lean_ctor_set(v_reuseFailAlloc_370_, 1, v_tail_338_);
v___x_360_ = v_reuseFailAlloc_370_;
goto v_reusejp_359_;
}
v_reusejp_359_:
{
lean_object* v___x_361_; lean_object* v___x_363_; 
v___x_361_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_336_ == 0)
{
lean_ctor_set(v___x_335_, 1, v___x_360_);
lean_ctor_set(v___x_335_, 0, v___x_361_);
v___x_363_ = v___x_335_;
goto v_reusejp_362_;
}
else
{
lean_object* v_reuseFailAlloc_369_; 
v_reuseFailAlloc_369_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_369_, 0, v___x_361_);
lean_ctor_set(v_reuseFailAlloc_369_, 1, v___x_360_);
v___x_363_ = v_reuseFailAlloc_369_;
goto v_reusejp_362_;
}
v_reusejp_362_:
{
lean_object* v___x_364_; lean_object* v___x_366_; 
v___x_364_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_323_ == 0)
{
lean_ctor_set(v___x_322_, 1, v___x_363_);
lean_ctor_set(v___x_322_, 0, v___x_364_);
v___x_366_ = v___x_322_;
goto v_reusejp_365_;
}
else
{
lean_object* v_reuseFailAlloc_368_; 
v_reuseFailAlloc_368_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_368_, 0, v___x_364_);
lean_ctor_set(v_reuseFailAlloc_368_, 1, v___x_363_);
v___x_366_ = v_reuseFailAlloc_368_;
goto v_reusejp_365_;
}
v_reusejp_365_:
{
lean_object* v___x_367_; 
v___x_367_ = lean_apply_9(v_h__9_293_, v___x_366_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_367_;
}
}
}
}
}
else
{
lean_object* v___x_371_; lean_object* v___x_373_; 
lean_dec(v_h__8_292_);
v___x_371_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_352_ == 0)
{
lean_ctor_set(v___x_351_, 0, v___x_371_);
v___x_373_ = v___x_351_;
goto v_reusejp_372_;
}
else
{
lean_object* v_reuseFailAlloc_383_; 
v_reuseFailAlloc_383_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_383_, 0, v___x_371_);
lean_ctor_set(v_reuseFailAlloc_383_, 1, v_tail_338_);
v___x_373_ = v_reuseFailAlloc_383_;
goto v_reusejp_372_;
}
v_reusejp_372_:
{
lean_object* v___x_374_; lean_object* v___x_376_; 
v___x_374_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_336_ == 0)
{
lean_ctor_set(v___x_335_, 1, v___x_373_);
lean_ctor_set(v___x_335_, 0, v___x_374_);
v___x_376_ = v___x_335_;
goto v_reusejp_375_;
}
else
{
lean_object* v_reuseFailAlloc_382_; 
v_reuseFailAlloc_382_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_382_, 0, v___x_374_);
lean_ctor_set(v_reuseFailAlloc_382_, 1, v___x_373_);
v___x_376_ = v_reuseFailAlloc_382_;
goto v_reusejp_375_;
}
v_reusejp_375_:
{
lean_object* v___x_377_; lean_object* v___x_379_; 
v___x_377_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_323_ == 0)
{
lean_ctor_set(v___x_322_, 1, v___x_376_);
lean_ctor_set(v___x_322_, 0, v___x_377_);
v___x_379_ = v___x_322_;
goto v_reusejp_378_;
}
else
{
lean_object* v_reuseFailAlloc_381_; 
v_reuseFailAlloc_381_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_381_, 0, v___x_377_);
lean_ctor_set(v_reuseFailAlloc_381_, 1, v___x_376_);
v___x_379_ = v_reuseFailAlloc_381_;
goto v_reusejp_378_;
}
v_reusejp_378_:
{
lean_object* v___x_380_; 
v___x_380_ = lean_apply_9(v_h__9_293_, v___x_379_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_380_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_387_; lean_object* v___x_389_; 
lean_dec(v_h__8_292_);
v___x_387_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_336_ == 0)
{
lean_ctor_set(v___x_335_, 0, v___x_387_);
v___x_389_ = v___x_335_;
goto v_reusejp_388_;
}
else
{
lean_object* v_reuseFailAlloc_395_; 
v_reuseFailAlloc_395_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_395_, 0, v___x_387_);
lean_ctor_set(v_reuseFailAlloc_395_, 1, v_tail_325_);
v___x_389_ = v_reuseFailAlloc_395_;
goto v_reusejp_388_;
}
v_reusejp_388_:
{
lean_object* v___x_390_; lean_object* v___x_392_; 
v___x_390_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_323_ == 0)
{
lean_ctor_set(v___x_322_, 1, v___x_389_);
lean_ctor_set(v___x_322_, 0, v___x_390_);
v___x_392_ = v___x_322_;
goto v_reusejp_391_;
}
else
{
lean_object* v_reuseFailAlloc_394_; 
v_reuseFailAlloc_394_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_394_, 0, v___x_390_);
lean_ctor_set(v_reuseFailAlloc_394_, 1, v___x_389_);
v___x_392_ = v_reuseFailAlloc_394_;
goto v_reusejp_391_;
}
v_reusejp_391_:
{
lean_object* v___x_393_; 
v___x_393_ = lean_apply_9(v_h__9_293_, v___x_392_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_393_;
}
}
}
}
}
}
else
{
lean_object* v___x_399_; lean_object* v___x_401_; 
lean_dec(v_h__8_292_);
v___x_399_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_323_ == 0)
{
lean_ctor_set(v___x_322_, 0, v___x_399_);
v___x_401_ = v___x_322_;
goto v_reusejp_400_;
}
else
{
lean_object* v_reuseFailAlloc_403_; 
v_reuseFailAlloc_403_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_403_, 0, v___x_399_);
lean_ctor_set(v_reuseFailAlloc_403_, 1, v_tail_295_);
v___x_401_ = v_reuseFailAlloc_403_;
goto v_reusejp_400_;
}
v_reusejp_400_:
{
lean_object* v___x_402_; 
v___x_402_ = lean_apply_9(v_h__9_293_, v___x_401_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_402_;
}
}
}
}
}
else
{
lean_object* v___x_407_; 
lean_dec_ref_known(v_x_284_, 2);
lean_dec(v_h__9_293_);
lean_dec(v_h__8_292_);
v___x_407_ = lean_apply_1(v_h__7_291_, v_tail_295_);
return v___x_407_;
}
}
else
{
lean_object* v___x_408_; 
lean_dec_ref_known(v_x_284_, 2);
lean_dec(v_h__9_293_);
lean_dec(v_h__8_292_);
lean_dec(v_h__7_291_);
v___x_408_ = lean_apply_1(v_h__6_290_, v_tail_295_);
return v___x_408_;
}
}
else
{
lean_object* v___x_409_; 
lean_dec_ref_known(v_x_284_, 2);
lean_dec(v_h__9_293_);
lean_dec(v_h__8_292_);
lean_dec(v_h__7_291_);
lean_dec(v_h__6_290_);
v___x_409_ = lean_apply_1(v_h__5_289_, v_tail_295_);
return v___x_409_;
}
}
else
{
lean_object* v___x_410_; 
lean_dec_ref_known(v_x_284_, 2);
lean_dec(v_h__9_293_);
lean_dec(v_h__8_292_);
lean_dec(v_h__7_291_);
lean_dec(v_h__6_290_);
lean_dec(v_h__5_289_);
v___x_410_ = lean_apply_1(v_h__4_288_, v_tail_295_);
return v___x_410_;
}
}
else
{
lean_object* v___x_411_; 
lean_dec_ref_known(v_x_284_, 2);
lean_dec(v_h__9_293_);
lean_dec(v_h__8_292_);
lean_dec(v_h__7_291_);
lean_dec(v_h__6_290_);
lean_dec(v_h__5_289_);
lean_dec(v_h__4_288_);
v___x_411_ = lean_apply_1(v_h__3_287_, v_tail_295_);
return v___x_411_;
}
}
else
{
lean_object* v___x_412_; 
lean_dec_ref_known(v_x_284_, 2);
lean_dec(v_h__9_293_);
lean_dec(v_h__8_292_);
lean_dec(v_h__7_291_);
lean_dec(v_h__6_290_);
lean_dec(v_h__5_289_);
lean_dec(v_h__4_288_);
lean_dec(v_h__3_287_);
v___x_412_ = lean_apply_1(v_h__2_286_, v_tail_295_);
return v___x_412_;
}
}
else
{
lean_object* v___x_413_; 
lean_dec_ref_known(v_x_284_, 2);
lean_dec(v_h__9_293_);
lean_dec(v_h__8_292_);
lean_dec(v_h__7_291_);
lean_dec(v_h__6_290_);
lean_dec(v_h__5_289_);
lean_dec(v_h__4_288_);
lean_dec(v_h__3_287_);
lean_dec(v_h__2_286_);
v___x_413_ = lean_apply_1(v_h__1_285_, v_tail_295_);
return v___x_413_;
}
}
else
{
lean_object* v___x_414_; 
lean_dec(v_h__8_292_);
lean_dec(v_h__7_291_);
lean_dec(v_h__6_290_);
lean_dec(v_h__5_289_);
lean_dec(v_h__4_288_);
lean_dec(v_h__3_287_);
lean_dec(v_h__2_286_);
lean_dec(v_h__1_285_);
v___x_414_ = lean_apply_9(v_h__9_293_, v_x_284_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_414_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_decodeEscape_match__1_splitter(lean_object* v_motive_415_, lean_object* v_x_416_, lean_object* v_h__1_417_, lean_object* v_h__2_418_, lean_object* v_h__3_419_, lean_object* v_h__4_420_, lean_object* v_h__5_421_, lean_object* v_h__6_422_, lean_object* v_h__7_423_, lean_object* v_h__8_424_, lean_object* v_h__9_425_){
_start:
{
if (lean_obj_tag(v_x_416_) == 1)
{
lean_object* v_head_426_; lean_object* v_tail_427_; uint32_t v___x_428_; uint32_t v___x_429_; uint8_t v___x_430_; 
v_head_426_ = lean_ctor_get(v_x_416_, 0);
v_tail_427_ = lean_ctor_get(v_x_416_, 1);
lean_inc(v_tail_427_);
v___x_428_ = 34;
v___x_429_ = lean_unbox_uint32(v_head_426_);
v___x_430_ = lean_uint32_dec_eq(v___x_429_, v___x_428_);
if (v___x_430_ == 0)
{
uint32_t v___x_431_; uint32_t v___x_432_; uint8_t v___x_433_; 
lean_dec(v_h__1_417_);
v___x_431_ = 92;
v___x_432_ = lean_unbox_uint32(v_head_426_);
v___x_433_ = lean_uint32_dec_eq(v___x_432_, v___x_431_);
if (v___x_433_ == 0)
{
uint32_t v___x_434_; uint32_t v___x_435_; uint8_t v___x_436_; 
lean_dec(v_h__2_418_);
v___x_434_ = 98;
v___x_435_ = lean_unbox_uint32(v_head_426_);
v___x_436_ = lean_uint32_dec_eq(v___x_435_, v___x_434_);
if (v___x_436_ == 0)
{
uint32_t v___x_437_; uint32_t v___x_438_; uint8_t v___x_439_; 
lean_dec(v_h__3_419_);
v___x_437_ = 116;
v___x_438_ = lean_unbox_uint32(v_head_426_);
v___x_439_ = lean_uint32_dec_eq(v___x_438_, v___x_437_);
if (v___x_439_ == 0)
{
uint32_t v___x_440_; uint32_t v___x_441_; uint8_t v___x_442_; 
lean_dec(v_h__4_420_);
v___x_440_ = 110;
v___x_441_ = lean_unbox_uint32(v_head_426_);
v___x_442_ = lean_uint32_dec_eq(v___x_441_, v___x_440_);
if (v___x_442_ == 0)
{
uint32_t v___x_443_; uint32_t v___x_444_; uint8_t v___x_445_; 
lean_dec(v_h__5_421_);
v___x_443_ = 102;
v___x_444_ = lean_unbox_uint32(v_head_426_);
v___x_445_ = lean_uint32_dec_eq(v___x_444_, v___x_443_);
if (v___x_445_ == 0)
{
uint32_t v___x_446_; uint32_t v___x_447_; uint8_t v___x_448_; 
lean_dec(v_h__6_422_);
v___x_446_ = 114;
v___x_447_ = lean_unbox_uint32(v_head_426_);
v___x_448_ = lean_uint32_dec_eq(v___x_447_, v___x_446_);
if (v___x_448_ == 0)
{
uint32_t v___x_449_; uint32_t v___x_450_; uint8_t v___x_451_; 
lean_dec(v_h__7_423_);
v___x_449_ = 117;
v___x_450_ = lean_unbox_uint32(v_head_426_);
v___x_451_ = lean_uint32_dec_eq(v___x_450_, v___x_449_);
if (v___x_451_ == 0)
{
lean_object* v___x_452_; 
lean_dec(v_tail_427_);
lean_dec(v_h__8_424_);
v___x_452_ = lean_apply_9(v_h__9_425_, v_x_416_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_452_;
}
else
{
lean_object* v___x_454_; uint8_t v_isShared_455_; uint8_t v_isSharedCheck_536_; 
v_isSharedCheck_536_ = !lean_is_exclusive(v_x_416_);
if (v_isSharedCheck_536_ == 0)
{
lean_object* v_unused_537_; lean_object* v_unused_538_; 
v_unused_537_ = lean_ctor_get(v_x_416_, 1);
lean_dec(v_unused_537_);
v_unused_538_ = lean_ctor_get(v_x_416_, 0);
lean_dec(v_unused_538_);
v___x_454_ = v_x_416_;
v_isShared_455_ = v_isSharedCheck_536_;
goto v_resetjp_453_;
}
else
{
lean_dec(v_x_416_);
v___x_454_ = lean_box(0);
v_isShared_455_ = v_isSharedCheck_536_;
goto v_resetjp_453_;
}
v_resetjp_453_:
{
if (lean_obj_tag(v_tail_427_) == 1)
{
lean_object* v_head_456_; lean_object* v_tail_457_; uint32_t v___x_458_; uint32_t v___x_459_; uint8_t v___x_460_; 
v_head_456_ = lean_ctor_get(v_tail_427_, 0);
v_tail_457_ = lean_ctor_get(v_tail_427_, 1);
lean_inc(v_tail_457_);
v___x_458_ = 48;
v___x_459_ = lean_unbox_uint32(v_head_456_);
v___x_460_ = lean_uint32_dec_eq(v___x_459_, v___x_458_);
if (v___x_460_ == 0)
{
lean_object* v___x_461_; lean_object* v___x_463_; 
lean_dec(v_tail_457_);
lean_dec(v_h__8_424_);
v___x_461_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_455_ == 0)
{
lean_ctor_set(v___x_454_, 0, v___x_461_);
v___x_463_ = v___x_454_;
goto v_reusejp_462_;
}
else
{
lean_object* v_reuseFailAlloc_465_; 
v_reuseFailAlloc_465_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_465_, 0, v___x_461_);
lean_ctor_set(v_reuseFailAlloc_465_, 1, v_tail_427_);
v___x_463_ = v_reuseFailAlloc_465_;
goto v_reusejp_462_;
}
v_reusejp_462_:
{
lean_object* v___x_464_; 
v___x_464_ = lean_apply_9(v_h__9_425_, v___x_463_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_464_;
}
}
else
{
lean_object* v___x_467_; uint8_t v_isShared_468_; uint8_t v_isSharedCheck_528_; 
v_isSharedCheck_528_ = !lean_is_exclusive(v_tail_427_);
if (v_isSharedCheck_528_ == 0)
{
lean_object* v_unused_529_; lean_object* v_unused_530_; 
v_unused_529_ = lean_ctor_get(v_tail_427_, 1);
lean_dec(v_unused_529_);
v_unused_530_ = lean_ctor_get(v_tail_427_, 0);
lean_dec(v_unused_530_);
v___x_467_ = v_tail_427_;
v_isShared_468_ = v_isSharedCheck_528_;
goto v_resetjp_466_;
}
else
{
lean_dec(v_tail_427_);
v___x_467_ = lean_box(0);
v_isShared_468_ = v_isSharedCheck_528_;
goto v_resetjp_466_;
}
v_resetjp_466_:
{
if (lean_obj_tag(v_tail_457_) == 1)
{
lean_object* v_head_469_; lean_object* v_tail_470_; uint32_t v___x_471_; uint8_t v___x_472_; 
v_head_469_ = lean_ctor_get(v_tail_457_, 0);
v_tail_470_ = lean_ctor_get(v_tail_457_, 1);
v___x_471_ = lean_unbox_uint32(v_head_469_);
v___x_472_ = lean_uint32_dec_eq(v___x_471_, v___x_458_);
if (v___x_472_ == 0)
{
lean_object* v___x_473_; lean_object* v___x_475_; 
lean_dec(v_h__8_424_);
v___x_473_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_468_ == 0)
{
lean_ctor_set(v___x_467_, 0, v___x_473_);
v___x_475_ = v___x_467_;
goto v_reusejp_474_;
}
else
{
lean_object* v_reuseFailAlloc_481_; 
v_reuseFailAlloc_481_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_481_, 0, v___x_473_);
lean_ctor_set(v_reuseFailAlloc_481_, 1, v_tail_457_);
v___x_475_ = v_reuseFailAlloc_481_;
goto v_reusejp_474_;
}
v_reusejp_474_:
{
lean_object* v___x_476_; lean_object* v___x_478_; 
v___x_476_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_455_ == 0)
{
lean_ctor_set(v___x_454_, 1, v___x_475_);
lean_ctor_set(v___x_454_, 0, v___x_476_);
v___x_478_ = v___x_454_;
goto v_reusejp_477_;
}
else
{
lean_object* v_reuseFailAlloc_480_; 
v_reuseFailAlloc_480_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_480_, 0, v___x_476_);
lean_ctor_set(v_reuseFailAlloc_480_, 1, v___x_475_);
v___x_478_ = v_reuseFailAlloc_480_;
goto v_reusejp_477_;
}
v_reusejp_477_:
{
lean_object* v___x_479_; 
v___x_479_ = lean_apply_9(v_h__9_425_, v___x_478_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_479_;
}
}
}
else
{
lean_object* v___x_483_; uint8_t v_isShared_484_; uint8_t v_isSharedCheck_516_; 
lean_inc(v_tail_470_);
v_isSharedCheck_516_ = !lean_is_exclusive(v_tail_457_);
if (v_isSharedCheck_516_ == 0)
{
lean_object* v_unused_517_; lean_object* v_unused_518_; 
v_unused_517_ = lean_ctor_get(v_tail_457_, 1);
lean_dec(v_unused_517_);
v_unused_518_ = lean_ctor_get(v_tail_457_, 0);
lean_dec(v_unused_518_);
v___x_483_ = v_tail_457_;
v_isShared_484_ = v_isSharedCheck_516_;
goto v_resetjp_482_;
}
else
{
lean_dec(v_tail_457_);
v___x_483_ = lean_box(0);
v_isShared_484_ = v_isSharedCheck_516_;
goto v_resetjp_482_;
}
v_resetjp_482_:
{
if (lean_obj_tag(v_tail_470_) == 1)
{
lean_object* v_tail_485_; 
v_tail_485_ = lean_ctor_get(v_tail_470_, 1);
if (lean_obj_tag(v_tail_485_) == 1)
{
lean_object* v_head_486_; lean_object* v_head_487_; lean_object* v_tail_488_; lean_object* v___x_489_; 
lean_inc_ref(v_tail_485_);
lean_del_object(v___x_483_);
lean_del_object(v___x_467_);
lean_del_object(v___x_454_);
lean_dec(v_h__9_425_);
v_head_486_ = lean_ctor_get(v_tail_470_, 0);
lean_inc(v_head_486_);
lean_dec_ref_known(v_tail_470_, 2);
v_head_487_ = lean_ctor_get(v_tail_485_, 0);
lean_inc(v_head_487_);
v_tail_488_ = lean_ctor_get(v_tail_485_, 1);
lean_inc(v_tail_488_);
lean_dec_ref_known(v_tail_485_, 2);
v___x_489_ = lean_apply_3(v_h__8_424_, v_head_486_, v_head_487_, v_tail_488_);
return v___x_489_;
}
else
{
lean_object* v___x_490_; lean_object* v___x_492_; 
lean_dec(v_h__8_424_);
v___x_490_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_484_ == 0)
{
lean_ctor_set(v___x_483_, 0, v___x_490_);
v___x_492_ = v___x_483_;
goto v_reusejp_491_;
}
else
{
lean_object* v_reuseFailAlloc_502_; 
v_reuseFailAlloc_502_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_502_, 0, v___x_490_);
lean_ctor_set(v_reuseFailAlloc_502_, 1, v_tail_470_);
v___x_492_ = v_reuseFailAlloc_502_;
goto v_reusejp_491_;
}
v_reusejp_491_:
{
lean_object* v___x_493_; lean_object* v___x_495_; 
v___x_493_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_468_ == 0)
{
lean_ctor_set(v___x_467_, 1, v___x_492_);
lean_ctor_set(v___x_467_, 0, v___x_493_);
v___x_495_ = v___x_467_;
goto v_reusejp_494_;
}
else
{
lean_object* v_reuseFailAlloc_501_; 
v_reuseFailAlloc_501_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_501_, 0, v___x_493_);
lean_ctor_set(v_reuseFailAlloc_501_, 1, v___x_492_);
v___x_495_ = v_reuseFailAlloc_501_;
goto v_reusejp_494_;
}
v_reusejp_494_:
{
lean_object* v___x_496_; lean_object* v___x_498_; 
v___x_496_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_455_ == 0)
{
lean_ctor_set(v___x_454_, 1, v___x_495_);
lean_ctor_set(v___x_454_, 0, v___x_496_);
v___x_498_ = v___x_454_;
goto v_reusejp_497_;
}
else
{
lean_object* v_reuseFailAlloc_500_; 
v_reuseFailAlloc_500_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_500_, 0, v___x_496_);
lean_ctor_set(v_reuseFailAlloc_500_, 1, v___x_495_);
v___x_498_ = v_reuseFailAlloc_500_;
goto v_reusejp_497_;
}
v_reusejp_497_:
{
lean_object* v___x_499_; 
v___x_499_ = lean_apply_9(v_h__9_425_, v___x_498_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_499_;
}
}
}
}
}
else
{
lean_object* v___x_503_; lean_object* v___x_505_; 
lean_dec(v_h__8_424_);
v___x_503_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_484_ == 0)
{
lean_ctor_set(v___x_483_, 0, v___x_503_);
v___x_505_ = v___x_483_;
goto v_reusejp_504_;
}
else
{
lean_object* v_reuseFailAlloc_515_; 
v_reuseFailAlloc_515_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_515_, 0, v___x_503_);
lean_ctor_set(v_reuseFailAlloc_515_, 1, v_tail_470_);
v___x_505_ = v_reuseFailAlloc_515_;
goto v_reusejp_504_;
}
v_reusejp_504_:
{
lean_object* v___x_506_; lean_object* v___x_508_; 
v___x_506_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_468_ == 0)
{
lean_ctor_set(v___x_467_, 1, v___x_505_);
lean_ctor_set(v___x_467_, 0, v___x_506_);
v___x_508_ = v___x_467_;
goto v_reusejp_507_;
}
else
{
lean_object* v_reuseFailAlloc_514_; 
v_reuseFailAlloc_514_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_514_, 0, v___x_506_);
lean_ctor_set(v_reuseFailAlloc_514_, 1, v___x_505_);
v___x_508_ = v_reuseFailAlloc_514_;
goto v_reusejp_507_;
}
v_reusejp_507_:
{
lean_object* v___x_509_; lean_object* v___x_511_; 
v___x_509_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_455_ == 0)
{
lean_ctor_set(v___x_454_, 1, v___x_508_);
lean_ctor_set(v___x_454_, 0, v___x_509_);
v___x_511_ = v___x_454_;
goto v_reusejp_510_;
}
else
{
lean_object* v_reuseFailAlloc_513_; 
v_reuseFailAlloc_513_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_513_, 0, v___x_509_);
lean_ctor_set(v_reuseFailAlloc_513_, 1, v___x_508_);
v___x_511_ = v_reuseFailAlloc_513_;
goto v_reusejp_510_;
}
v_reusejp_510_:
{
lean_object* v___x_512_; 
v___x_512_ = lean_apply_9(v_h__9_425_, v___x_511_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_512_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_519_; lean_object* v___x_521_; 
lean_dec(v_h__8_424_);
v___x_519_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2;
if (v_isShared_468_ == 0)
{
lean_ctor_set(v___x_467_, 0, v___x_519_);
v___x_521_ = v___x_467_;
goto v_reusejp_520_;
}
else
{
lean_object* v_reuseFailAlloc_527_; 
v_reuseFailAlloc_527_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_527_, 0, v___x_519_);
lean_ctor_set(v_reuseFailAlloc_527_, 1, v_tail_457_);
v___x_521_ = v_reuseFailAlloc_527_;
goto v_reusejp_520_;
}
v_reusejp_520_:
{
lean_object* v___x_522_; lean_object* v___x_524_; 
v___x_522_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_455_ == 0)
{
lean_ctor_set(v___x_454_, 1, v___x_521_);
lean_ctor_set(v___x_454_, 0, v___x_522_);
v___x_524_ = v___x_454_;
goto v_reusejp_523_;
}
else
{
lean_object* v_reuseFailAlloc_526_; 
v_reuseFailAlloc_526_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_526_, 0, v___x_522_);
lean_ctor_set(v_reuseFailAlloc_526_, 1, v___x_521_);
v___x_524_ = v_reuseFailAlloc_526_;
goto v_reusejp_523_;
}
v_reusejp_523_:
{
lean_object* v___x_525_; 
v___x_525_ = lean_apply_9(v_h__9_425_, v___x_524_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_525_;
}
}
}
}
}
}
else
{
lean_object* v___x_531_; lean_object* v___x_533_; 
lean_dec(v_h__8_424_);
v___x_531_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1;
if (v_isShared_455_ == 0)
{
lean_ctor_set(v___x_454_, 0, v___x_531_);
v___x_533_ = v___x_454_;
goto v_reusejp_532_;
}
else
{
lean_object* v_reuseFailAlloc_535_; 
v_reuseFailAlloc_535_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_535_, 0, v___x_531_);
lean_ctor_set(v_reuseFailAlloc_535_, 1, v_tail_427_);
v___x_533_ = v_reuseFailAlloc_535_;
goto v_reusejp_532_;
}
v_reusejp_532_:
{
lean_object* v___x_534_; 
v___x_534_ = lean_apply_9(v_h__9_425_, v___x_533_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_534_;
}
}
}
}
}
else
{
lean_object* v___x_539_; 
lean_dec_ref_known(v_x_416_, 2);
lean_dec(v_h__9_425_);
lean_dec(v_h__8_424_);
v___x_539_ = lean_apply_1(v_h__7_423_, v_tail_427_);
return v___x_539_;
}
}
else
{
lean_object* v___x_540_; 
lean_dec_ref_known(v_x_416_, 2);
lean_dec(v_h__9_425_);
lean_dec(v_h__8_424_);
lean_dec(v_h__7_423_);
v___x_540_ = lean_apply_1(v_h__6_422_, v_tail_427_);
return v___x_540_;
}
}
else
{
lean_object* v___x_541_; 
lean_dec_ref_known(v_x_416_, 2);
lean_dec(v_h__9_425_);
lean_dec(v_h__8_424_);
lean_dec(v_h__7_423_);
lean_dec(v_h__6_422_);
v___x_541_ = lean_apply_1(v_h__5_421_, v_tail_427_);
return v___x_541_;
}
}
else
{
lean_object* v___x_542_; 
lean_dec_ref_known(v_x_416_, 2);
lean_dec(v_h__9_425_);
lean_dec(v_h__8_424_);
lean_dec(v_h__7_423_);
lean_dec(v_h__6_422_);
lean_dec(v_h__5_421_);
v___x_542_ = lean_apply_1(v_h__4_420_, v_tail_427_);
return v___x_542_;
}
}
else
{
lean_object* v___x_543_; 
lean_dec_ref_known(v_x_416_, 2);
lean_dec(v_h__9_425_);
lean_dec(v_h__8_424_);
lean_dec(v_h__7_423_);
lean_dec(v_h__6_422_);
lean_dec(v_h__5_421_);
lean_dec(v_h__4_420_);
v___x_543_ = lean_apply_1(v_h__3_419_, v_tail_427_);
return v___x_543_;
}
}
else
{
lean_object* v___x_544_; 
lean_dec_ref_known(v_x_416_, 2);
lean_dec(v_h__9_425_);
lean_dec(v_h__8_424_);
lean_dec(v_h__7_423_);
lean_dec(v_h__6_422_);
lean_dec(v_h__5_421_);
lean_dec(v_h__4_420_);
lean_dec(v_h__3_419_);
v___x_544_ = lean_apply_1(v_h__2_418_, v_tail_427_);
return v___x_544_;
}
}
else
{
lean_object* v___x_545_; 
lean_dec_ref_known(v_x_416_, 2);
lean_dec(v_h__9_425_);
lean_dec(v_h__8_424_);
lean_dec(v_h__7_423_);
lean_dec(v_h__6_422_);
lean_dec(v_h__5_421_);
lean_dec(v_h__4_420_);
lean_dec(v_h__3_419_);
lean_dec(v_h__2_418_);
v___x_545_ = lean_apply_1(v_h__1_417_, v_tail_427_);
return v___x_545_;
}
}
else
{
lean_object* v___x_546_; 
lean_dec(v_h__8_424_);
lean_dec(v_h__7_423_);
lean_dec(v_h__6_422_);
lean_dec(v_h__5_421_);
lean_dec(v_h__4_420_);
lean_dec(v_h__3_419_);
lean_dec(v_h__2_418_);
lean_dec(v_h__1_417_);
v___x_546_ = lean_apply_9(v_h__9_425_, v_x_416_, lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0), lean_box(0));
return v___x_546_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_readUnit_match__1_splitter___redArg(lean_object* v_x_547_, lean_object* v_h__1_548_, lean_object* v_h__2_549_, lean_object* v_h__3_550_){
_start:
{
if (lean_obj_tag(v_x_547_) == 0)
{
lean_object* v___x_551_; lean_object* v___x_552_; 
lean_dec(v_h__2_549_);
lean_dec(v_h__1_548_);
v___x_551_ = lean_box(0);
v___x_552_ = lean_apply_1(v_h__3_550_, v___x_551_);
return v___x_552_;
}
else
{
lean_object* v_head_553_; lean_object* v_tail_554_; uint32_t v___x_555_; uint32_t v___x_556_; uint8_t v___x_557_; 
lean_dec(v_h__3_550_);
v_head_553_ = lean_ctor_get(v_x_547_, 0);
lean_inc(v_head_553_);
v_tail_554_ = lean_ctor_get(v_x_547_, 1);
lean_inc(v_tail_554_);
lean_dec_ref_known(v_x_547_, 2);
v___x_555_ = 92;
v___x_556_ = lean_unbox_uint32(v_head_553_);
v___x_557_ = lean_uint32_dec_eq(v___x_556_, v___x_555_);
if (v___x_557_ == 0)
{
lean_object* v___x_558_; 
lean_dec(v_h__1_548_);
v___x_558_ = lean_apply_3(v_h__2_549_, v_head_553_, v_tail_554_, lean_box(0));
return v___x_558_;
}
else
{
lean_object* v___x_559_; 
lean_dec(v_head_553_);
lean_dec(v_h__2_549_);
v___x_559_ = lean_apply_1(v_h__1_548_, v_tail_554_);
return v___x_559_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_readUnit_match__1_splitter(lean_object* v_motive_560_, lean_object* v_x_561_, lean_object* v_h__1_562_, lean_object* v_h__2_563_, lean_object* v_h__3_564_){
_start:
{
if (lean_obj_tag(v_x_561_) == 0)
{
lean_object* v___x_565_; lean_object* v___x_566_; 
lean_dec(v_h__2_563_);
lean_dec(v_h__1_562_);
v___x_565_ = lean_box(0);
v___x_566_ = lean_apply_1(v_h__3_564_, v___x_565_);
return v___x_566_;
}
else
{
lean_object* v_head_567_; lean_object* v_tail_568_; uint32_t v___x_569_; uint32_t v___x_570_; uint8_t v___x_571_; 
lean_dec(v_h__3_564_);
v_head_567_ = lean_ctor_get(v_x_561_, 0);
lean_inc(v_head_567_);
v_tail_568_ = lean_ctor_get(v_x_561_, 1);
lean_inc(v_tail_568_);
lean_dec_ref_known(v_x_561_, 2);
v___x_569_ = 92;
v___x_570_ = lean_unbox_uint32(v_head_567_);
v___x_571_ = lean_uint32_dec_eq(v___x_570_, v___x_569_);
if (v___x_571_ == 0)
{
lean_object* v___x_572_; 
lean_dec(v_h__1_562_);
v___x_572_ = lean_apply_3(v_h__2_563_, v_head_567_, v_tail_568_, lean_box(0));
return v___x_572_;
}
else
{
lean_object* v___x_573_; 
lean_dec(v_head_567_);
lean_dec(v_h__2_563_);
v___x_573_ = lean_apply_1(v_h__1_562_, v_tail_568_);
return v___x_573_;
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_JsonString_escapedBody_spec__0(lean_object* v_a_574_, lean_object* v_a_575_){
_start:
{
if (lean_obj_tag(v_a_574_) == 0)
{
lean_object* v___x_576_; 
v___x_576_ = lean_array_to_list(v_a_575_);
return v___x_576_;
}
else
{
lean_object* v_head_577_; lean_object* v_tail_578_; uint32_t v___x_579_; lean_object* v___x_580_; lean_object* v___x_581_; 
v_head_577_ = lean_ctor_get(v_a_574_, 0);
v_tail_578_ = lean_ctor_get(v_a_574_, 1);
v___x_579_ = lean_unbox_uint32(v_head_577_);
v___x_580_ = lp_algalVerification_Algal_Core_JsonString_escapeChar(v___x_579_);
v___x_581_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_575_, v___x_580_);
v_a_574_ = v_tail_578_;
v_a_575_ = v___x_581_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_JsonString_escapedBody_spec__0___boxed(lean_object* v_a_583_, lean_object* v_a_584_){
_start:
{
lean_object* v_res_585_; 
v_res_585_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_JsonString_escapedBody_spec__0(v_a_583_, v_a_584_);
lean_dec(v_a_583_);
return v_res_585_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapedBody(lean_object* v_chars_588_){
_start:
{
lean_object* v___x_589_; lean_object* v___x_590_; 
v___x_589_ = ((lean_object*)(lp_algalVerification_Algal_Core_JsonString_escapedBody___closed__0));
v___x_590_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_JsonString_escapedBody_spec__0(v_chars_588_, v___x_589_);
return v___x_590_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_escapedBody___boxed(lean_object* v_chars_591_){
_start:
{
lean_object* v_res_592_; 
v_res_592_ = lp_algalVerification_Algal_Core_JsonString_escapedBody(v_chars_591_);
lean_dec(v_chars_591_);
return v_res_592_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_quoteChars(lean_object* v_value_593_){
_start:
{
lean_object* v___x_594_; lean_object* v___x_595_; lean_object* v___x_596_; lean_object* v___x_597_; lean_object* v___x_598_; lean_object* v___x_599_; 
v___x_594_ = lean_string_data(v_value_593_);
v___x_595_ = lp_algalVerification_Algal_Core_JsonString_escapedBody(v___x_594_);
lean_dec(v___x_594_);
v___x_596_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1;
v___x_597_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_597_, 0, v___x_596_);
lean_ctor_set(v___x_597_, 1, v___x_595_);
v___x_598_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12, &lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12_once, _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12);
v___x_599_ = l_List_appendTR___redArg(v___x_597_, v___x_598_);
return v___x_599_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_quote(lean_object* v_value_600_){
_start:
{
lean_object* v___x_601_; lean_object* v___x_602_; 
v___x_601_ = lp_algalVerification_Algal_Core_JsonString_quoteChars(v_value_600_);
v___x_602_ = lean_string_mk(v___x_601_);
return v___x_602_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_quoteBytes(lean_object* v_value_603_){
_start:
{
lean_object* v___x_604_; lean_object* v___x_605_; 
v___x_604_ = lp_algalVerification_Algal_Core_JsonString_quote(v_value_603_);
v___x_605_ = lean_string_to_utf8(v___x_604_);
lean_dec_ref(v___x_604_);
return v___x_605_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_JsonString_scan___closed__0(void){
_start:
{
lean_object* v___x_606_; lean_object* v___x_607_; 
v___x_606_ = lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1;
v___x_607_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_607_, 0, v___x_606_);
return v___x_607_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_scan(lean_object* v_x_608_, lean_object* v_x_609_){
_start:
{
lean_object* v_zero_610_; uint8_t v_isZero_611_; 
v_zero_610_ = lean_unsigned_to_nat(0u);
v_isZero_611_ = lean_nat_dec_eq(v_x_608_, v_zero_610_);
if (v_isZero_611_ == 1)
{
lean_object* v___x_612_; 
lean_dec(v_x_609_);
v___x_612_ = lean_box(0);
return v___x_612_;
}
else
{
lean_object* v___x_613_; lean_object* v___x_614_; lean_object* v___x_615_; uint8_t v___x_616_; 
v___x_613_ = lean_alloc_closure((void*)(l_instDecidableEqChar___boxed), 2, 0);
v___x_614_ = l_List_head_x3f___redArg(v_x_609_);
v___x_615_ = lean_obj_once(&lp_algalVerification_Algal_Core_JsonString_scan___closed__0, &lp_algalVerification_Algal_Core_JsonString_scan___closed__0_once, _init_lp_algalVerification_Algal_Core_JsonString_scan___closed__0);
v___x_616_ = l_Option_instDecidableEq___redArg(v___x_613_, v___x_614_, v___x_615_);
if (v___x_616_ == 0)
{
lean_object* v___x_617_; 
v___x_617_ = lp_algalVerification_Algal_Core_JsonString_readUnit(v_x_609_);
if (lean_obj_tag(v___x_617_) == 0)
{
lean_object* v___x_618_; 
v___x_618_ = lean_box(0);
return v___x_618_;
}
else
{
lean_object* v_val_619_; lean_object* v_fst_620_; lean_object* v_snd_621_; lean_object* v___x_623_; uint8_t v_isShared_624_; uint8_t v_isSharedCheck_648_; 
v_val_619_ = lean_ctor_get(v___x_617_, 0);
lean_inc(v_val_619_);
lean_dec_ref_known(v___x_617_, 1);
v_fst_620_ = lean_ctor_get(v_val_619_, 0);
v_snd_621_ = lean_ctor_get(v_val_619_, 1);
v_isSharedCheck_648_ = !lean_is_exclusive(v_val_619_);
if (v_isSharedCheck_648_ == 0)
{
v___x_623_ = v_val_619_;
v_isShared_624_ = v_isSharedCheck_648_;
goto v_resetjp_622_;
}
else
{
lean_inc(v_snd_621_);
lean_inc(v_fst_620_);
lean_dec(v_val_619_);
v___x_623_ = lean_box(0);
v_isShared_624_ = v_isSharedCheck_648_;
goto v_resetjp_622_;
}
v_resetjp_622_:
{
lean_object* v_one_625_; lean_object* v_n_626_; lean_object* v___x_627_; 
v_one_625_ = lean_unsigned_to_nat(1u);
v_n_626_ = lean_nat_sub(v_x_608_, v_one_625_);
v___x_627_ = lp_algalVerification_Algal_Core_JsonString_scan(v_n_626_, v_snd_621_);
lean_dec(v_n_626_);
if (lean_obj_tag(v___x_627_) == 0)
{
lean_del_object(v___x_623_);
lean_dec(v_fst_620_);
return v___x_627_;
}
else
{
lean_object* v_val_628_; lean_object* v___x_630_; uint8_t v_isShared_631_; uint8_t v_isSharedCheck_647_; 
v_val_628_ = lean_ctor_get(v___x_627_, 0);
v_isSharedCheck_647_ = !lean_is_exclusive(v___x_627_);
if (v_isSharedCheck_647_ == 0)
{
v___x_630_ = v___x_627_;
v_isShared_631_ = v_isSharedCheck_647_;
goto v_resetjp_629_;
}
else
{
lean_inc(v_val_628_);
lean_dec(v___x_627_);
v___x_630_ = lean_box(0);
v_isShared_631_ = v_isSharedCheck_647_;
goto v_resetjp_629_;
}
v_resetjp_629_:
{
lean_object* v_fst_632_; lean_object* v_snd_633_; lean_object* v___x_635_; uint8_t v_isShared_636_; uint8_t v_isSharedCheck_646_; 
v_fst_632_ = lean_ctor_get(v_val_628_, 0);
v_snd_633_ = lean_ctor_get(v_val_628_, 1);
v_isSharedCheck_646_ = !lean_is_exclusive(v_val_628_);
if (v_isSharedCheck_646_ == 0)
{
v___x_635_ = v_val_628_;
v_isShared_636_ = v_isSharedCheck_646_;
goto v_resetjp_634_;
}
else
{
lean_inc(v_snd_633_);
lean_inc(v_fst_632_);
lean_dec(v_val_628_);
v___x_635_ = lean_box(0);
v_isShared_636_ = v_isSharedCheck_646_;
goto v_resetjp_634_;
}
v_resetjp_634_:
{
lean_object* v___x_638_; 
if (v_isShared_624_ == 0)
{
lean_ctor_set_tag(v___x_623_, 1);
lean_ctor_set(v___x_623_, 1, v_fst_632_);
v___x_638_ = v___x_623_;
goto v_reusejp_637_;
}
else
{
lean_object* v_reuseFailAlloc_645_; 
v_reuseFailAlloc_645_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_645_, 0, v_fst_620_);
lean_ctor_set(v_reuseFailAlloc_645_, 1, v_fst_632_);
v___x_638_ = v_reuseFailAlloc_645_;
goto v_reusejp_637_;
}
v_reusejp_637_:
{
lean_object* v___x_640_; 
if (v_isShared_636_ == 0)
{
lean_ctor_set(v___x_635_, 0, v___x_638_);
v___x_640_ = v___x_635_;
goto v_reusejp_639_;
}
else
{
lean_object* v_reuseFailAlloc_644_; 
v_reuseFailAlloc_644_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_644_, 0, v___x_638_);
lean_ctor_set(v_reuseFailAlloc_644_, 1, v_snd_633_);
v___x_640_ = v_reuseFailAlloc_644_;
goto v_reusejp_639_;
}
v_reusejp_639_:
{
lean_object* v___x_642_; 
if (v_isShared_631_ == 0)
{
lean_ctor_set(v___x_630_, 0, v___x_640_);
v___x_642_ = v___x_630_;
goto v_reusejp_641_;
}
else
{
lean_object* v_reuseFailAlloc_643_; 
v_reuseFailAlloc_643_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_643_, 0, v___x_640_);
v___x_642_ = v_reuseFailAlloc_643_;
goto v_reusejp_641_;
}
v_reusejp_641_:
{
return v___x_642_;
}
}
}
}
}
}
}
}
}
else
{
lean_object* v___x_649_; lean_object* v___y_651_; 
v___x_649_ = lean_box(0);
if (lean_obj_tag(v_x_609_) == 0)
{
v___y_651_ = v_x_609_;
goto v___jp_650_;
}
else
{
lean_object* v_tail_654_; 
v_tail_654_ = lean_ctor_get(v_x_609_, 1);
lean_inc(v_tail_654_);
lean_dec_ref_known(v_x_609_, 2);
v___y_651_ = v_tail_654_;
goto v___jp_650_;
}
v___jp_650_:
{
lean_object* v___x_652_; lean_object* v___x_653_; 
v___x_652_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_652_, 0, v___x_649_);
lean_ctor_set(v___x_652_, 1, v___y_651_);
v___x_653_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_653_, 0, v___x_652_);
return v___x_653_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_scan___boxed(lean_object* v_x_655_, lean_object* v_x_656_){
_start:
{
lean_object* v_res_657_; 
v_res_657_ = lp_algalVerification_Algal_Core_JsonString_scan(v_x_655_, v_x_656_);
lean_dec(v_x_655_);
return v_res_657_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter___redArg(lean_object* v_x_658_, lean_object* v_x_659_, lean_object* v_h__1_660_, lean_object* v_h__2_661_){
_start:
{
lean_object* v_zero_662_; uint8_t v_isZero_663_; 
v_zero_662_ = lean_unsigned_to_nat(0u);
v_isZero_663_ = lean_nat_dec_eq(v_x_658_, v_zero_662_);
if (v_isZero_663_ == 1)
{
lean_object* v___x_664_; 
lean_dec(v_h__2_661_);
v___x_664_ = lean_apply_1(v_h__1_660_, v_x_659_);
return v___x_664_;
}
else
{
lean_object* v_one_665_; lean_object* v_n_666_; lean_object* v___x_667_; 
lean_dec(v_h__1_660_);
v_one_665_ = lean_unsigned_to_nat(1u);
v_n_666_ = lean_nat_sub(v_x_658_, v_one_665_);
v___x_667_ = lean_apply_2(v_h__2_661_, v_n_666_, v_x_659_);
return v___x_667_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter___redArg___boxed(lean_object* v_x_668_, lean_object* v_x_669_, lean_object* v_h__1_670_, lean_object* v_h__2_671_){
_start:
{
lean_object* v_res_672_; 
v_res_672_ = lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter___redArg(v_x_668_, v_x_669_, v_h__1_670_, v_h__2_671_);
lean_dec(v_x_668_);
return v_res_672_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter(lean_object* v_motive_673_, lean_object* v_x_674_, lean_object* v_x_675_, lean_object* v_h__1_676_, lean_object* v_h__2_677_){
_start:
{
lean_object* v_zero_678_; uint8_t v_isZero_679_; 
v_zero_678_ = lean_unsigned_to_nat(0u);
v_isZero_679_ = lean_nat_dec_eq(v_x_674_, v_zero_678_);
if (v_isZero_679_ == 1)
{
lean_object* v___x_680_; 
lean_dec(v_h__2_677_);
v___x_680_ = lean_apply_1(v_h__1_676_, v_x_675_);
return v___x_680_;
}
else
{
lean_object* v_one_681_; lean_object* v_n_682_; lean_object* v___x_683_; 
lean_dec(v_h__1_676_);
v_one_681_ = lean_unsigned_to_nat(1u);
v_n_682_ = lean_nat_sub(v_x_674_, v_one_681_);
v___x_683_ = lean_apply_2(v_h__2_677_, v_n_682_, v_x_675_);
return v___x_683_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter___boxed(lean_object* v_motive_684_, lean_object* v_x_685_, lean_object* v_x_686_, lean_object* v_h__1_687_, lean_object* v_h__2_688_){
_start:
{
lean_object* v_res_689_; 
v_res_689_ = lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__5_splitter(v_motive_684_, v_x_685_, v_x_686_, v_h__1_687_, v_h__2_688_);
lean_dec(v_x_685_);
return v_res_689_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__3_splitter___redArg(lean_object* v_x_690_, lean_object* v_h__1_691_){
_start:
{
lean_object* v_fst_692_; lean_object* v_snd_693_; lean_object* v___x_694_; 
v_fst_692_ = lean_ctor_get(v_x_690_, 0);
lean_inc(v_fst_692_);
v_snd_693_ = lean_ctor_get(v_x_690_, 1);
lean_inc(v_snd_693_);
lean_dec_ref(v_x_690_);
v___x_694_ = lean_apply_2(v_h__1_691_, v_fst_692_, v_snd_693_);
return v___x_694_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__3_splitter(lean_object* v_motive_695_, lean_object* v_x_696_, lean_object* v_h__1_697_){
_start:
{
lean_object* v_fst_698_; lean_object* v_snd_699_; lean_object* v___x_700_; 
v_fst_698_ = lean_ctor_get(v_x_696_, 0);
lean_inc(v_fst_698_);
v_snd_699_ = lean_ctor_get(v_x_696_, 1);
lean_inc(v_snd_699_);
lean_dec_ref(v_x_696_);
v___x_700_ = lean_apply_2(v_h__1_697_, v_fst_698_, v_snd_699_);
return v___x_700_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__1_splitter___redArg(lean_object* v_x_701_, lean_object* v_h__1_702_){
_start:
{
lean_object* v_fst_703_; lean_object* v_snd_704_; lean_object* v___x_705_; 
v_fst_703_ = lean_ctor_get(v_x_701_, 0);
lean_inc(v_fst_703_);
v_snd_704_ = lean_ctor_get(v_x_701_, 1);
lean_inc(v_snd_704_);
lean_dec_ref(v_x_701_);
v___x_705_ = lean_apply_2(v_h__1_702_, v_fst_703_, v_snd_704_);
return v___x_705_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_scan_match__1_splitter(lean_object* v_motive_706_, lean_object* v_x_707_, lean_object* v_h__1_708_){
_start:
{
lean_object* v_fst_709_; lean_object* v_snd_710_; lean_object* v___x_711_; 
v_fst_709_ = lean_ctor_get(v_x_707_, 0);
lean_inc(v_fst_709_);
v_snd_710_ = lean_ctor_get(v_x_707_, 1);
lean_inc(v_snd_710_);
lean_dec_ref(v_x_707_);
v___x_711_ = lean_apply_2(v_h__1_708_, v_fst_709_, v_snd_710_);
return v___x_711_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_readQuoted(lean_object* v_x_712_){
_start:
{
if (lean_obj_tag(v_x_712_) == 1)
{
lean_object* v_head_713_; lean_object* v_tail_714_; uint32_t v___x_715_; uint32_t v___x_716_; uint8_t v___x_717_; 
v_head_713_ = lean_ctor_get(v_x_712_, 0);
lean_inc(v_head_713_);
v_tail_714_ = lean_ctor_get(v_x_712_, 1);
lean_inc(v_tail_714_);
lean_dec_ref_known(v_x_712_, 2);
v___x_715_ = 34;
v___x_716_ = lean_unbox_uint32(v_head_713_);
lean_dec(v_head_713_);
v___x_717_ = lean_uint32_dec_eq(v___x_716_, v___x_715_);
if (v___x_717_ == 0)
{
lean_object* v___x_718_; 
lean_dec(v_tail_714_);
v___x_718_ = lean_box(0);
return v___x_718_;
}
else
{
lean_object* v___x_719_; lean_object* v___x_720_; 
v___x_719_ = l_List_lengthTR___redArg(v_tail_714_);
v___x_720_ = lp_algalVerification_Algal_Core_JsonString_scan(v___x_719_, v_tail_714_);
lean_dec(v___x_719_);
if (lean_obj_tag(v___x_720_) == 0)
{
lean_object* v___x_721_; 
v___x_721_ = lean_box(0);
return v___x_721_;
}
else
{
lean_object* v_val_722_; lean_object* v___x_724_; uint8_t v_isShared_725_; uint8_t v_isSharedCheck_739_; 
v_val_722_ = lean_ctor_get(v___x_720_, 0);
v_isSharedCheck_739_ = !lean_is_exclusive(v___x_720_);
if (v_isSharedCheck_739_ == 0)
{
v___x_724_ = v___x_720_;
v_isShared_725_ = v_isSharedCheck_739_;
goto v_resetjp_723_;
}
else
{
lean_inc(v_val_722_);
lean_dec(v___x_720_);
v___x_724_ = lean_box(0);
v_isShared_725_ = v_isSharedCheck_739_;
goto v_resetjp_723_;
}
v_resetjp_723_:
{
lean_object* v_fst_726_; lean_object* v_snd_727_; lean_object* v___x_729_; uint8_t v_isShared_730_; uint8_t v_isSharedCheck_738_; 
v_fst_726_ = lean_ctor_get(v_val_722_, 0);
v_snd_727_ = lean_ctor_get(v_val_722_, 1);
v_isSharedCheck_738_ = !lean_is_exclusive(v_val_722_);
if (v_isSharedCheck_738_ == 0)
{
v___x_729_ = v_val_722_;
v_isShared_730_ = v_isSharedCheck_738_;
goto v_resetjp_728_;
}
else
{
lean_inc(v_snd_727_);
lean_inc(v_fst_726_);
lean_dec(v_val_722_);
v___x_729_ = lean_box(0);
v_isShared_730_ = v_isSharedCheck_738_;
goto v_resetjp_728_;
}
v_resetjp_728_:
{
lean_object* v___x_731_; lean_object* v___x_733_; 
v___x_731_ = lean_string_mk(v_fst_726_);
if (v_isShared_730_ == 0)
{
lean_ctor_set(v___x_729_, 0, v___x_731_);
v___x_733_ = v___x_729_;
goto v_reusejp_732_;
}
else
{
lean_object* v_reuseFailAlloc_737_; 
v_reuseFailAlloc_737_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_737_, 0, v___x_731_);
lean_ctor_set(v_reuseFailAlloc_737_, 1, v_snd_727_);
v___x_733_ = v_reuseFailAlloc_737_;
goto v_reusejp_732_;
}
v_reusejp_732_:
{
lean_object* v___x_735_; 
if (v_isShared_725_ == 0)
{
lean_ctor_set(v___x_724_, 0, v___x_733_);
v___x_735_ = v___x_724_;
goto v_reusejp_734_;
}
else
{
lean_object* v_reuseFailAlloc_736_; 
v_reuseFailAlloc_736_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_736_, 0, v___x_733_);
v___x_735_ = v_reuseFailAlloc_736_;
goto v_reusejp_734_;
}
v_reusejp_734_:
{
return v___x_735_;
}
}
}
}
}
}
}
else
{
lean_object* v___x_740_; 
lean_dec(v_x_712_);
v___x_740_ = lean_box(0);
return v___x_740_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_readQuoted_match__1_splitter___redArg(lean_object* v_x_741_, lean_object* v_h__1_742_, lean_object* v_h__2_743_){
_start:
{
if (lean_obj_tag(v_x_741_) == 1)
{
lean_object* v_head_744_; lean_object* v_tail_745_; uint32_t v___x_746_; uint32_t v___x_747_; uint8_t v___x_748_; 
v_head_744_ = lean_ctor_get(v_x_741_, 0);
v_tail_745_ = lean_ctor_get(v_x_741_, 1);
v___x_746_ = 34;
v___x_747_ = lean_unbox_uint32(v_head_744_);
v___x_748_ = lean_uint32_dec_eq(v___x_747_, v___x_746_);
if (v___x_748_ == 0)
{
lean_object* v___x_749_; 
lean_dec(v_h__1_742_);
v___x_749_ = lean_apply_2(v_h__2_743_, v_x_741_, lean_box(0));
return v___x_749_;
}
else
{
lean_object* v___x_750_; 
lean_inc(v_tail_745_);
lean_dec_ref_known(v_x_741_, 2);
lean_dec(v_h__2_743_);
v___x_750_ = lean_apply_1(v_h__1_742_, v_tail_745_);
return v___x_750_;
}
}
else
{
lean_object* v___x_751_; 
lean_dec(v_h__1_742_);
v___x_751_ = lean_apply_2(v_h__2_743_, v_x_741_, lean_box(0));
return v___x_751_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_JsonString_0__Algal_Core_JsonString_readQuoted_match__1_splitter(lean_object* v_motive_752_, lean_object* v_x_753_, lean_object* v_h__1_754_, lean_object* v_h__2_755_){
_start:
{
if (lean_obj_tag(v_x_753_) == 1)
{
lean_object* v_head_756_; lean_object* v_tail_757_; uint32_t v___x_758_; uint32_t v___x_759_; uint8_t v___x_760_; 
v_head_756_ = lean_ctor_get(v_x_753_, 0);
v_tail_757_ = lean_ctor_get(v_x_753_, 1);
v___x_758_ = 34;
v___x_759_ = lean_unbox_uint32(v_head_756_);
v___x_760_ = lean_uint32_dec_eq(v___x_759_, v___x_758_);
if (v___x_760_ == 0)
{
lean_object* v___x_761_; 
lean_dec(v_h__1_754_);
v___x_761_ = lean_apply_2(v_h__2_755_, v_x_753_, lean_box(0));
return v___x_761_;
}
else
{
lean_object* v___x_762_; 
lean_inc(v_tail_757_);
lean_dec_ref_known(v_x_753_, 2);
lean_dec(v_h__2_755_);
v___x_762_ = lean_apply_1(v_h__1_754_, v_tail_757_);
return v___x_762_;
}
}
else
{
lean_object* v___x_763_; 
lean_dec(v_h__1_754_);
v___x_763_ = lean_apply_2(v_h__2_755_, v_x_753_, lean_box(0));
return v___x_763_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_readBytes(lean_object* v_bytes_764_){
_start:
{
uint8_t v___x_765_; 
v___x_765_ = lean_string_validate_utf8(v_bytes_764_);
if (v___x_765_ == 0)
{
lean_object* v___x_766_; 
lean_dec_ref(v_bytes_764_);
v___x_766_ = lean_box(0);
return v___x_766_;
}
else
{
lean_object* v___x_767_; lean_object* v___x_768_; lean_object* v___x_769_; 
v___x_767_ = lean_string_from_utf8_unchecked(v_bytes_764_);
v___x_768_ = lean_string_data(v___x_767_);
v___x_769_ = lp_algalVerification_Algal_Core_JsonString_readQuoted(v___x_768_);
return v___x_769_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_JsonString_decodeBytes(lean_object* v_bytes_770_){
_start:
{
lean_object* v___x_771_; 
v___x_771_ = lp_algalVerification_Algal_Core_JsonString_readBytes(v_bytes_770_);
if (lean_obj_tag(v___x_771_) == 0)
{
lean_object* v___x_772_; 
v___x_772_ = lean_box(0);
return v___x_772_;
}
else
{
lean_object* v_val_773_; lean_object* v___x_775_; uint8_t v_isShared_776_; uint8_t v_isSharedCheck_784_; 
v_val_773_ = lean_ctor_get(v___x_771_, 0);
v_isSharedCheck_784_ = !lean_is_exclusive(v___x_771_);
if (v_isSharedCheck_784_ == 0)
{
v___x_775_ = v___x_771_;
v_isShared_776_ = v_isSharedCheck_784_;
goto v_resetjp_774_;
}
else
{
lean_inc(v_val_773_);
lean_dec(v___x_771_);
v___x_775_ = lean_box(0);
v_isShared_776_ = v_isSharedCheck_784_;
goto v_resetjp_774_;
}
v_resetjp_774_:
{
lean_object* v_fst_777_; lean_object* v_snd_778_; uint8_t v___x_779_; 
v_fst_777_ = lean_ctor_get(v_val_773_, 0);
lean_inc(v_fst_777_);
v_snd_778_ = lean_ctor_get(v_val_773_, 1);
lean_inc(v_snd_778_);
lean_dec(v_val_773_);
v___x_779_ = l_List_instDecidableEqNil___redArg(v_snd_778_);
lean_dec(v_snd_778_);
if (v___x_779_ == 0)
{
lean_object* v___x_780_; 
lean_dec(v_fst_777_);
lean_del_object(v___x_775_);
v___x_780_ = lean_box(0);
return v___x_780_;
}
else
{
lean_object* v___x_782_; 
if (v_isShared_776_ == 0)
{
lean_ctor_set(v___x_775_, 0, v_fst_777_);
v___x_782_ = v___x_775_;
goto v_reusejp_781_;
}
else
{
lean_object* v_reuseFailAlloc_783_; 
v_reuseFailAlloc_783_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_783_, 0, v_fst_777_);
v___x_782_ = v_reuseFailAlloc_783_;
goto v_reusejp_781_;
}
v_reusejp_781_:
{
return v___x_782_;
}
}
}
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init_Data_String_Lemmas_Basic(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_JsonString(uint8_t builtin) {
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
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_String_Lemmas_Basic(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__0___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__1___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__2___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__4___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__6___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__8___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___closed__12___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2 = _init_lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_escapeChar___boxed__const__2);
lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__1 = _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__1();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__1);
lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__2 = _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__2();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__2);
lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__3 = _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__3();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__3);
lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__4 = _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__4();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__4);
lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__5 = _init_lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__5();
lean_mark_persistent(lp_algalVerification_Algal_Core_JsonString_decodeEscape___boxed__const__5);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
